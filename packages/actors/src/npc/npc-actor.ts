import { createActor, type ActorRefFrom } from 'xstate';
import type { WorldEvent } from '@arcagentic/schemas';
import type { Actor, BaseActorState, NpcActorConfig } from '../base/types.js';
import { BaseActorLifecycle } from '../base/lifecycle.js';
import { createNpcMachine } from './npc-machine.js';
import type { CognitionContextExtras, NpcMachineContext } from './types.js';

/**
 * NPC Actor implementation using XState.
 */
export class NpcActor implements Actor {
  readonly id: string;
  readonly type = 'npc' as const;
  readonly sessionId: string;

  private readonly npcId: string;
  private readonly locationId: string;
  private readonly machine: ActorRefFrom<ReturnType<typeof createNpcMachine>>;
  private readonly lifecycle: BaseActorLifecycle;

  constructor(config: NpcActorConfig & CognitionContextExtras) {
    this.id = config.id;
    this.sessionId = config.sessionId;
    this.npcId = config.npcId;
    this.locationId = config.locationId;

    // Create XState machine context
    const context: NpcMachineContext = {
      actorId: this.id,
      npcId: this.npcId,
      sessionId: this.sessionId,
      locationId: this.locationId,
      recentEvents: [],
      ...(config.profile ? { profile: config.profile } : {}),
      ...(config.llmProvider ? { llmProvider: config.llmProvider } : {}),
      ...(config.relationships ? { relationships: config.relationships } : {}),
      ...(config.playerName !== undefined ? { playerName: config.playerName } : {}),
      ...(config.playerDescription !== undefined
        ? { playerDescription: config.playerDescription }
        : {}),
      ...(config.startingScenario !== undefined
        ? { startingScenario: config.startingScenario }
        : {}),
    };

    // Create and start the machine
    const machineDef = createNpcMachine(context);
    this.machine = createActor(machineDef);

    this.lifecycle = new BaseActorLifecycle(this);
  }

  start(): void {
    this.machine.start();
    void this.lifecycle.start();
  }

  stop(): void {
    this.machine.stop();
    this.lifecycle.stop();
  }

  send(event: WorldEvent): void {
    this.machine.send({ type: 'WORLD_EVENT', event });
  }

  getSnapshot(): BaseActorState {
    return {
      id: this.id,
      type: this.type,
      locationId: this.locationId,
      sessionId: this.sessionId,
      spawnedAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  /**
   * Get the current machine state (for debugging).
   */
  getMachineState(): string {
    const snapshot = this.machine.getSnapshot();
    return JSON.stringify(snapshot.value);
  }
}
