import { createMachine, assign, fromPromise } from 'xstate';
import type { Intent, WorldEvent } from '@arcagentic/schemas';
import type {
  EpisodicMemorySummary,
  NpcMachineContext,
  NpcMachineEvent,
  NpcRuntimeState,
} from './types.js';
import {
  DEFAULT_PERCEPTION_CONFIG,
  EventPromoter,
  PerceptionLayer,
} from './perception.js';
import { CognitionLayer } from './cognition.js';
import { classifyEventForNpc, evaluateEngagement } from './engagement.js';
import { applyPersonalityModifiers } from './personality-modifiers.js';
import { getStringField } from './event-access.js';
import { worldBus } from '@arcagentic/bus';

function summarizeEventForMemoryQuery(event: WorldEvent): string {
  const actorId = getStringField(event, 'actorId') ?? 'unknown';

  if (event.type === 'SPOKE') {
    const content = getStringField(event, 'content');
    return content ? `${actorId} said: ${content}` : `${actorId} spoke`;
  }

  return `${actorId} ${event.type.toLowerCase().replaceAll('_', ' ')}`;
}

function buildRecentContextQuery(events: WorldEvent[]): string {
  return events.slice(-2).map(summarizeEventForMemoryQuery).join('\n');
}

function buildNpcRuntimeState(context: NpcMachineContext): NpcRuntimeState {
  return {
    id: context.actorId,
    type: 'npc',
    npcId: context.npcId,
    sessionId: context.sessionId,
    locationId: context.locationId,
    spawnedAt: new Date(),
    lastActiveAt: new Date(),
    recentEvents: context.recentEvents,
    goals: [],
  };
}

function isPlayerActorId(actorId: string | undefined): boolean {
  if (!actorId) {
    return false;
  }

  return actorId === 'player' || actorId.startsWith('player:');
}

/**
 * NPC state machine definition.
 *
 * States:
 * - idle: Waiting for events
 * - perceiving: Processing incoming events
 * - evaluating: Applying deterministic engagement gating
 * - thinking: Deciding on actions
 * - acting: Emitting intents
 * - waiting: Cooldown period
 */
export const createNpcMachine = (
  initialContext: NpcMachineContext
) => {
  const promoter = new EventPromoter(
    initialContext.perceptionConfig ?? DEFAULT_PERCEPTION_CONFIG,
    () => undefined
  );

  return createMachine(
    {
      id: 'npc',
      initial: 'idle',
      context: initialContext,
      types: {} as {
        context: NpcMachineContext;
        events: NpcMachineEvent;
      },
      on: {
        SET_NARRATOR_HISTORY: {
          actions: assign({
            narratorHistory: ({ event, context }) =>
              event.type === 'SET_NARRATOR_HISTORY'
                ? event.narratorHistory
                : context.narratorHistory,
          }),
        },
        SET_CONTEXT_EXTRAS: {
          actions: assign(({ event }) =>
            event.type === 'SET_CONTEXT_EXTRAS' ? event.contextExtras : {}
          ),
        },
      },
      states: {
        idle: {
          on: {
            WORLD_EVENT: {
              guard: 'isMeaningfulEvent',
              actions: 'bufferEvent',
              target: 'perceiving',
            },
          },
        },
        perceiving: {
          entry: 'perceive',
          always: {
            target: 'evaluating',
          },
        },
        evaluating: {
          entry: 'evaluateEngagement',
          always: [
            {
              guard: 'shouldInvokeCognition',
              target: 'thinking',
            },
            {
              target: 'waiting',
            },
          ],
        },
        thinking: {
          invoke: {
            src: 'llmDecision',
            input: ({ context }: { context: NpcMachineContext }): NpcMachineContext => ({
              ...context,
            }),
            onDone: {
              target: 'acting',
              actions: assign({
                pendingIntent: ({ event }) => (event.output as WorldEvent | null) ?? undefined,
              }),
            },
            onError: {
              target: 'acting',
              actions: assign({ pendingIntent: () => undefined }),
            },
          },
        },
        acting: {
          entry: 'emitIntent',
          always: {
            target: 'waiting',
          },
        },
        waiting: {
          after: {
            500: 'idle', // 500ms cooldown
          },
          entry: 'clearEvents',
        },
      },
    },
    {
      actions: {
        bufferEvent: assign({
          recentEvents: ({ context, event }) => {
            if (event.type === 'WORLD_EVENT') {
              return [...context.recentEvents, event.event].slice(-10);
            }
            return context.recentEvents;
          },
        }),
        perceive: assign({
          perception: ({ context }) => {
            const perception = PerceptionLayer.buildContext(
              context.recentEvents,
              buildNpcRuntimeState(context),
              context.nearbyActorIds
            );

            return {
              ...perception,
              ...(context.narratorHistory ? { narratorHistory: context.narratorHistory } : {}),
            };
          },
        }),
        evaluateEngagement: assign(({ context }) => {
          const perception = context.perception;
          if (!perception) {
            return {
              engagementDecision: {
                shouldAct: false,
                reason: 'No perception context available',
              },
            };
          }

          const classifiedEvents = perception.relevantEvents.map((event) => ({
            event,
            addressType: classifyEventForNpc(
              event,
              context.actorId,
              context.locationId,
              context.playerProximity
            ),
          }));

          const playerSpeechEvents = classifiedEvents.filter(
            ({ event }) =>
              event.type === 'SPOKE' && isPlayerActorId(getStringField(event, 'actorId'))
          );
          const playerAddressedDirectly =
            playerSpeechEvents.length > 0
              ? playerSpeechEvents.some(({ addressType }) => addressType === 'direct')
              : undefined;
          const modifiers = context.profile?.personalityMap
            ? applyPersonalityModifiers(context.profile.personalityMap, perception)
            : undefined;

          return {
            engagementDecision: evaluateEngagement(classifiedEvents, {
              ...(context.playerProximity !== undefined
                ? { playerProximity: context.playerProximity }
                : {}),
              ...(context.currentActivity !== undefined
                ? { currentActivity: context.currentActivity }
                : {}),
              ...(context.interruptible !== undefined
                ? { interruptible: context.interruptible }
                : {}),
              ...(modifiers?.socialBias !== undefined
                ? { socialBias: modifiers.socialBias }
                : {}),
            }),
            ...(playerAddressedDirectly !== undefined ? { playerAddressedDirectly } : {}),
          };
        }),
        think: () => undefined,
        emitIntent: ({ context }) => {
          if (context.pendingIntent) {
            const isIntentEvent = (event: WorldEvent): event is Intent =>
              event.type.endsWith('_INTENT');

            if (isIntentEvent(context.pendingIntent)) {
              const enriched: Intent = {
                ...context.pendingIntent,
                sessionId: context.sessionId,
                actorId: context.actorId ?? context.npcId,
                timestamp: new Date(),
              };
              void worldBus.emit(enriched);
              return;
            }

            void worldBus.emit(context.pendingIntent);
          }
        },
        clearEvents: assign({
          recentEvents: () => [],
          perception: () => undefined,
          pendingIntent: () => undefined,
          engagementDecision: () => undefined,
          playerAddressedDirectly: () => undefined,
        }),
      },
      guards: {
        isMeaningfulEvent: ({ event }) => {
          if (event.type !== 'WORLD_EVENT') {
            return false;
          }

          if (event.event.type === 'TICK') {
            return false;
          }

          return promoter.evaluate(event.event) !== 'drop';
        },
        shouldInvokeCognition: ({ context }) => context.engagementDecision?.shouldAct ?? false,
      },
      actors: {
        llmDecision: fromPromise(async ({ input }: { input: NpcMachineContext }) => {
          const context = input;
          if (!context.perception) return null;

          const cognitionContext = {
            perception: context.perception,
            state: buildNpcRuntimeState(context),
            availableActions: ['SPEAK_INTENT', 'MOVE_INTENT'],
          };

          const llmProvider = context.llmProvider;
          const profile = context.profile;

          if (llmProvider && profile) {
            let episodicMemories: EpisodicMemorySummary[] = [];

            if (context.memoryProvider) {
              const recentContext = buildRecentContextQuery(context.perception.relevantEvents);

              if (recentContext.length > 0) {
                episodicMemories = await context.memoryProvider
                  .getEpisodicMemories({
                    sessionId: context.sessionId,
                    actorId: context.actorId,
                    recentContext,
                  })
                  .catch((error: unknown) => {
                    console.warn(
                      `[NPC Memory] Episodic recall failed for ${context.actorId}; continuing without memories`,
                      error
                    );
                    return [];
                  });
              }
            }

            const result = await CognitionLayer.decideLLM(
              cognitionContext,
              profile,
              llmProvider,
              {
                ...(context.relationships ? { relationships: context.relationships } : {}),
                ...(context.playerName !== undefined ? { playerName: context.playerName } : {}),
                ...(context.playerDescription !== undefined
                  ? { playerDescription: context.playerDescription }
                  : {}),
                ...(context.playerAppealTags !== undefined
                  ? { playerAppealTags: context.playerAppealTags }
                  : {}),
                ...(context.startingScenario !== undefined
                  ? { startingScenario: context.startingScenario }
                  : {}),
                ...(context.locationName !== undefined
                  ? { locationName: context.locationName }
                  : {}),
                ...(context.locationDescription !== undefined
                  ? { locationDescription: context.locationDescription }
                  : {}),
                ...(context.currentActivity !== undefined
                  ? { currentActivity: context.currentActivity }
                  : {}),
                ...(context.playerProximity !== undefined
                  ? { playerProximity: context.playerProximity }
                  : {}),
                ...(context.interruptible !== undefined
                  ? { interruptible: context.interruptible }
                  : {}),
                ...(context.playerAddressedDirectly !== undefined
                  ? { playerAddressedDirectly: context.playerAddressedDirectly }
                  : {}),
                ...(context.nearbyNpcSummaries !== undefined
                  ? { nearbyNpcSummaries: context.nearbyNpcSummaries }
                  : {}),
              },
              episodicMemories
            );

            if (result.type === 'tool_calls') {
              return null;
            }

            return result.result?.intent ?? null;
          }

          const result = CognitionLayer.decideSync(cognitionContext);
          return result?.intent ?? null;
        }),
      },
    }
  );
};
