import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  actorFactionReputation,
  actorStates,
  dialogueState,
  dialogueTrees,
  entityProfiles,
  events,
  factionRelationships,
  knowledgeEdges,
  knowledgeNodes,
  locationMaps,
  locationPrefabs,
  locations,
  prefabConnections,
  prefabEntryPoints,
  prefabLocationInstances,
  promptTags,
  scheduleTemplates,
  sessionParticipants,
  sessionProjections,
  sessions,
  sessionTags,
  studioSessions,
  userAccounts,
  workspaceDrafts,
} from '../../src/schema/index.js';

function columnNames(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.keys(getTableColumns(table));
}

function foreignKeys(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).foreignKeys.map((foreignKey) => foreignKey.reference());
}

function constraintColumnNames(columns: Array<{ name: string }>): string[] {
  return columns.map((column) => column.name);
}

describe('schema tables', () => {
  it('exports every major table expected by the package public surface', () => {
    expect(sessions).toBeDefined();
    expect(sessionParticipants).toBeDefined();
    expect(events).toBeDefined();
    expect(actorStates).toBeDefined();
    expect(entityProfiles).toBeDefined();
    expect(locations).toBeDefined();
    expect(locationMaps).toBeDefined();
    expect(userAccounts).toBeDefined();
    expect(sessionProjections).toBeDefined();
    expect(promptTags).toBeDefined();
    expect(sessionTags).toBeDefined();
    expect(workspaceDrafts).toBeDefined();
    expect(factionRelationships).toBeDefined();
    expect(actorFactionReputation).toBeDefined();
    expect(dialogueTrees).toBeDefined();
    expect(dialogueState).toBeDefined();
    expect(knowledgeNodes).toBeDefined();
    expect(knowledgeEdges).toBeDefined();
    expect(studioSessions).toBeDefined();
    expect(locationPrefabs).toBeDefined();
    expect(prefabLocationInstances).toBeDefined();
    expect(prefabConnections).toBeDefined();
    expect(prefabEntryPoints).toBeDefined();
    expect(scheduleTemplates).toBeDefined();
  });

  it('defines the sessions table with the expected identity and ownership columns', () => {
    expect(columnNames(sessions)).toEqual(
      expect.arrayContaining([
        'id',
        'ownerEmail',
        'name',
        'settingId',
        'playerCharacterId',
        'locationMapId',
        'status',
        'mode',
        'eventSeq',
        'lastHeartbeatAt',
      ])
    );
  });

  it('keeps session defaults for status, mode, and sequence counters', () => {
    expect(sessions.status.default).toBe('active');
    expect(sessions.mode.default).toBe('solo');
    expect(sessions.eventSeq.default).toBe(0n);
    expect(sessions.eventSeq.notNull).toBe(true);
  });

  it('keeps session foreign keys pointing at users, profiles, and maps', () => {
    const sessionForeignKeys = foreignKeys(sessions);

    expect(sessionForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: [sessions.ownerEmail],
          foreignColumns: [userAccounts.email],
        }),
        expect.objectContaining({
          columns: [sessions.settingId],
          foreignColumns: [entityProfiles.id],
        }),
        expect.objectContaining({
          columns: [sessions.playerCharacterId],
          foreignColumns: [entityProfiles.id],
        }),
        expect.objectContaining({
          columns: [sessions.locationMapId],
          foreignColumns: [locationMaps.id],
        }),
      ])
    );
  });

  it('defines session participants with role defaults and a unique session-user constraint', () => {
    const config = getTableConfig(sessionParticipants);

    expect(columnNames(sessionParticipants)).toEqual(
      expect.arrayContaining(['sessionId', 'userEmail', 'role', 'status', 'canControlNpcs'])
    );
    expect(sessionParticipants.role.default).toBe('player');
    expect(config.uniqueConstraints).toHaveLength(1);
    expect(constraintColumnNames(config.uniqueConstraints[0]?.columns ?? [])).toEqual([
      'session_id',
      'user_email',
    ]);
  });

  it('defines the events table with sequence and causation columns', () => {
    expect(columnNames(events)).toEqual(
      expect.arrayContaining([
        'id',
        'sessionId',
        'sequence',
        'type',
        'payload',
        'actorId',
        'causedByEventId',
        'timestamp',
      ])
    );
    expect(events.sequence.notNull).toBe(true);
    expect(events.payload.notNull).toBe(true);
  });

  it('keeps the event session-sequence uniqueness guard in place', () => {
    const config = getTableConfig(events);

    expect(config.uniqueConstraints).toHaveLength(1);
    expect(constraintColumnNames(config.uniqueConstraints[0]?.columns ?? [])).toEqual([
      'session_id',
      'sequence',
    ]);
  });

  it('keeps event foreign keys for sessions and causal event chains', () => {
    const eventForeignKeys = getTableConfig(events).foreignKeys;

    expect(eventForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ onDelete: 'cascade' }),
        expect.objectContaining({ onDelete: 'set null' }),
      ])
    );

    expect(foreignKeys(events)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columns: [events.sessionId], foreignColumns: [sessions.id] }),
        expect.objectContaining({
          columns: [events.causedByEventId],
          foreignColumns: [events.id],
        }),
      ])
    );
  });

  it('defines actor state rows with actor identity and persisted state columns', () => {
    expect(columnNames(actorStates)).toEqual(
      expect.arrayContaining([
        'sessionId',
        'actorType',
        'actorId',
        'entityProfileId',
        'state',
        'lastEventSeq',
      ])
    );
    expect(actorStates.state.notNull).toBe(true);
    expect(actorStates.lastEventSeq.notNull).toBe(true);
  });

  it('keeps actor state foreign keys and uniqueness on session plus actor', () => {
    const config = getTableConfig(actorStates);

    expect(foreignKeys(actorStates)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columns: [actorStates.sessionId], foreignColumns: [sessions.id] }),
        expect.objectContaining({
          columns: [actorStates.entityProfileId],
          foreignColumns: [entityProfiles.id],
        }),
      ])
    );
    expect(constraintColumnNames(config.uniqueConstraints[0]?.columns ?? [])).toEqual([
      'session_id',
      'actor_id',
    ]);
  });

  it('defines projection state defaults for every projection bucket', () => {
    expect(sessionProjections.location.default).toEqual({});
    expect(sessionProjections.inventory.default).toEqual({});
    expect(sessionProjections.time.default).toEqual({});
    expect(sessionProjections.npcs.default).toEqual({});
    expect(sessionProjections.worldState.default).toEqual({});
    expect(sessionProjections.lastEventSeq.default).toBe(0n);
  });

  it('defines entity profiles with public visibility defaults and vector embedding', () => {
    expect(columnNames(entityProfiles)).toEqual(
      expect.arrayContaining([
        'id',
        'entityType',
        'name',
        'ownerEmail',
        'visibility',
        'tier',
        'profileJson',
        'tags',
        'embedding',
      ])
    );
    expect(entityProfiles.ownerEmail.default).toBe('public');
    expect(entityProfiles.visibility.default).toBe('public');
    expect(entityProfiles.profileJson.default).toEqual({});
    expect(entityProfiles.tags.default).toEqual([]);
  });

  it('defines locations with room and access defaults plus a self-parent foreign key', () => {
    expect(columnNames(locations)).toEqual(
      expect.arrayContaining(['settingId', 'type', 'isTemplate', 'tags', 'accessibility', 'parentLocationId'])
    );
    expect(locations.type.default).toBe('room');
    expect(locations.isTemplate.default).toBe(false);
    expect(locations.accessibility.default).toBe('open');
    expect(foreignKeys(locations)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columns: [locations.settingId], foreignColumns: [entityProfiles.id] }),
        expect.objectContaining({
          columns: [locations.parentLocationId],
          foreignColumns: [locations.id],
        }),
      ])
    );
  });

  it('defines location maps with json graph columns and setting-plus-start foreign keys', () => {
    expect(columnNames(locationMaps)).toEqual(
      expect.arrayContaining([
        'ownerEmail',
        'name',
        'settingId',
        'nodesJson',
        'connectionsJson',
        'defaultStartLocationId',
        'tags',
      ])
    );
    expect(locationMaps.ownerEmail.default).toBe('system');
    expect(locationMaps.nodesJson.default).toEqual([]);
    expect(locationMaps.connectionsJson.default).toEqual([]);
    expect(locationMaps.tags.default).toEqual([]);
    expect(foreignKeys(locationMaps)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: [locationMaps.settingId],
          foreignColumns: [entityProfiles.id],
        }),
        expect.objectContaining({
          columns: [locationMaps.defaultStartLocationId],
          foreignColumns: [locations.id],
        }),
      ])
    );
  });

  it('defines workspace drafts with stable workflow defaults', () => {
    expect(columnNames(workspaceDrafts)).toEqual(
      expect.arrayContaining(['userId', 'name', 'workspaceState', 'currentStep', 'validationState'])
    );
    expect(workspaceDrafts.workspaceState.default).toEqual({});
    expect(workspaceDrafts.currentStep.default).toBe('setting');
  });

  it('defines prompt tags and session tags with expected defaults and references', () => {
    expect(promptTags.category.default).toBe('style');
    expect(promptTags.isActive.default).toBe(true);
    expect(sessionTags.enabled.default).toBe(true);
    expect(foreignKeys(sessionTags)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columns: [sessionTags.sessionId], foreignColumns: [sessions.id] }),
        expect.objectContaining({ columns: [sessionTags.tagId], foreignColumns: [promptTags.id] }),
      ])
    );
  });

  it('defines faction tables with pair uniqueness and actor-faction uniqueness', () => {
    const relationshipConfig = getTableConfig(factionRelationships);
    const reputationConfig = getTableConfig(actorFactionReputation);

    expect(constraintColumnNames(relationshipConfig.uniqueConstraints[0]?.columns ?? [])).toEqual([
      'faction_a_id',
      'faction_b_id',
    ]);
    expect(constraintColumnNames(reputationConfig.uniqueConstraints[0]?.columns ?? [])).toEqual([
      'session_id',
      'actor_id',
      'faction_id',
    ]);
  });

  it('defines knowledge, dialogue, studio, and prefab tables with their key graph columns', () => {
    expect(columnNames(knowledgeNodes)).toEqual(
      expect.arrayContaining(['sessionId', 'ownerEmail', 'nodeType', 'content', 'embedding'])
    );
    expect(columnNames(knowledgeEdges)).toEqual(
      expect.arrayContaining(['fromNodeId', 'toNodeId', 'relation', 'strength'])
    );
    expect(columnNames(dialogueTrees)).toEqual(
      expect.arrayContaining(['npcId', 'triggerType', 'startNodeId', 'nodes'])
    );
    expect(columnNames(dialogueState)).toEqual(
      expect.arrayContaining(['sessionId', 'npcId', 'treeId', 'visitedNodes'])
    );
    expect(columnNames(studioSessions)).toEqual(
      expect.arrayContaining(['ownerEmail', 'profileSnapshot', 'conversation', 'expiresAt'])
    );
    expect(columnNames(locationPrefabs)).toEqual(
      expect.arrayContaining(['ownerEmail', 'nodesJson', 'connectionsJson', 'entryPoints'])
    );
    expect(columnNames(prefabLocationInstances)).toEqual(
      expect.arrayContaining(['prefabId', 'locationId', 'parentInstanceId', 'depth'])
    );
    expect(columnNames(prefabConnections)).toEqual(
      expect.arrayContaining(['prefabId', 'fromInstanceId', 'toInstanceId', 'direction'])
    );
    expect(columnNames(prefabEntryPoints)).toEqual(
      expect.arrayContaining(['prefabId', 'targetInstanceId', 'targetPortId', 'direction'])
    );
    expect(columnNames(scheduleTemplates)).toEqual(
      expect.arrayContaining(['name', 'description', 'scheduleJson'])
    );
  });
});
