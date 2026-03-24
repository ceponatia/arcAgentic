import { eq } from 'drizzle-orm';
import { getRecordOptional } from '@arcagentic/schemas';
import { drizzle as db } from '../connection/index.js';
import {
  actorStates,
  dialogueState,
  dialogueTrees,
  entityProfiles,
  events,
  locationMaps,
  locationPrefabs,
  locations,
  promptTags,
  sessionTags,
  sessions,
  studioSessions,
  userAccounts,
  workspaceDrafts,
} from '../schema/index.js';
import { resolvedDbUrl, pool } from '../utils/client.js';
import type {
  DbColumn,
  DbOverviewResult,
  DbPathInfo,
  DbRow,
  DbTableOverview,
  QueryResult,
} from '../types.js';

const ADMIN_OVERVIEW_TABLES = [
  'user_accounts',
  'sessions',
  'events',
  'actor_states',
  'entity_profiles',
  'locations',
  'location_maps',
  'location_prefabs',
  'prompt_tags',
  'session_tags',
  'workspace_drafts',
  'studio_sessions',
  'dialogue_trees',
  'dialogue_state',
] as const;

type AdminModelDeleteHandler = (id: string) => Promise<number>;

const ADMIN_DELETE_HANDLERS: Record<string, AdminModelDeleteHandler> = {
  useraccount: async (id) =>
    (await db.delete(userAccounts).where(eq(userAccounts.id, id)).returning({ id: userAccounts.id }))
      .length,
  useraccounts: async (id) =>
    (await db.delete(userAccounts).where(eq(userAccounts.id, id)).returning({ id: userAccounts.id }))
      .length,
  session: async (id) =>
    (await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id })).length,
  sessions: async (id) =>
    (await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id })).length,
  event: async (id) =>
    (await db.delete(events).where(eq(events.id, id)).returning({ id: events.id })).length,
  events: async (id) =>
    (await db.delete(events).where(eq(events.id, id)).returning({ id: events.id })).length,
  actorstate: async (id) =>
    (await db.delete(actorStates).where(eq(actorStates.id, id)).returning({ id: actorStates.id }))
      .length,
  actorstates: async (id) =>
    (await db.delete(actorStates).where(eq(actorStates.id, id)).returning({ id: actorStates.id }))
      .length,
  entityprofile: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  entityprofiles: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  characterprofile: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  characterprofiles: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  settingprofile: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  settingprofiles: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  personaprofile: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  personaprofiles: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  charactertemplate: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  charactertemplates: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  settingtemplate: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  settingtemplates: async (id) =>
    (await db
      .delete(entityProfiles)
      .where(eq(entityProfiles.id, id))
      .returning({ id: entityProfiles.id })).length,
  location: async (id) =>
    (await db.delete(locations).where(eq(locations.id, id)).returning({ id: locations.id })).length,
  locations: async (id) =>
    (await db.delete(locations).where(eq(locations.id, id)).returning({ id: locations.id })).length,
  locationmap: async (id) =>
    (await db
      .delete(locationMaps)
      .where(eq(locationMaps.id, id))
      .returning({ id: locationMaps.id })).length,
  locationmaps: async (id) =>
    (await db
      .delete(locationMaps)
      .where(eq(locationMaps.id, id))
      .returning({ id: locationMaps.id })).length,
  locationprefab: async (id) =>
    (await db
      .delete(locationPrefabs)
      .where(eq(locationPrefabs.id, id))
      .returning({ id: locationPrefabs.id })).length,
  locationprefabs: async (id) =>
    (await db
      .delete(locationPrefabs)
      .where(eq(locationPrefabs.id, id))
      .returning({ id: locationPrefabs.id })).length,
  prompttag: async (id) =>
    (await db.delete(promptTags).where(eq(promptTags.id, id)).returning({ id: promptTags.id }))
      .length,
  prompttags: async (id) =>
    (await db.delete(promptTags).where(eq(promptTags.id, id)).returning({ id: promptTags.id }))
      .length,
  sessiontag: async (id) =>
    (await db.delete(sessionTags).where(eq(sessionTags.id, id)).returning({ id: sessionTags.id }))
      .length,
  sessiontags: async (id) =>
    (await db.delete(sessionTags).where(eq(sessionTags.id, id)).returning({ id: sessionTags.id }))
      .length,
  sessiontagbinding: async (id) =>
    (await db.delete(sessionTags).where(eq(sessionTags.id, id)).returning({ id: sessionTags.id }))
      .length,
  sessiontagbindings: async (id) =>
    (await db.delete(sessionTags).where(eq(sessionTags.id, id)).returning({ id: sessionTags.id }))
      .length,
  workspacedraft: async (id) =>
    (await db
      .delete(workspaceDrafts)
      .where(eq(workspaceDrafts.id, id))
      .returning({ id: workspaceDrafts.id })).length,
  workspacedrafts: async (id) =>
    (await db
      .delete(workspaceDrafts)
      .where(eq(workspaceDrafts.id, id))
      .returning({ id: workspaceDrafts.id })).length,
  studiosession: async (id) =>
    (await db
      .delete(studioSessions)
      .where(eq(studioSessions.id, id))
      .returning({ id: studioSessions.id })).length,
  studiosessions: async (id) =>
    (await db
      .delete(studioSessions)
      .where(eq(studioSessions.id, id))
      .returning({ id: studioSessions.id })).length,
  dialoguetree: async (id) =>
    (await db
      .delete(dialogueTrees)
      .where(eq(dialogueTrees.id, id))
      .returning({ id: dialogueTrees.id })).length,
  dialoguetrees: async (id) =>
    (await db
      .delete(dialogueTrees)
      .where(eq(dialogueTrees.id, id))
      .returning({ id: dialogueTrees.id })).length,
  dialoguestate: async (id) =>
    (await db
      .delete(dialogueState)
      .where(eq(dialogueState.id, id))
      .returning({ id: dialogueState.id })).length,
  dialoguestates: async (id) =>
    (await db
      .delete(dialogueState)
      .where(eq(dialogueState.id, id))
      .returning({ id: dialogueState.id })).length,
};

function toDisplayName(tableName: string): string {
  return tableName
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

export async function getDbOverview(): Promise<DbOverviewResult> {
  const results: DbTableOverview[] = [];

  for (const tableName of ADMIN_OVERVIEW_TABLES) {
    const colsRes = await pool.query(
      `SELECT c.column_name, c.is_nullable, c.data_type
       FROM information_schema.columns c
       WHERE c.table_schema = 'public' AND c.table_name = $1
       ORDER BY c.ordinal_position`,
      [tableName]
    );
    const columns: DbColumn[] = colsRes.rows.map((r) => {
      const rec = r as Record<string, unknown>;
      const name = String(rec['column_name']);
      const type = String(rec['data_type']);
      const isNullable = String(rec['is_nullable']);
      return {
        name,
        type,
        isId: name === 'id',
        isRequired: isNullable === 'NO',
        isList: false,
      };
    });

    const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
    const rowCount = Number((countRes.rows[0] as Record<string, unknown>)['count'] ?? 0);

    const hasCreatedAt = columns.some((c) => c.name === 'created_at');
    const order = hasCreatedAt ? 'ORDER BY created_at DESC' : '';
    const sampleRes: QueryResult<DbRow> = await pool.query(
      `SELECT * FROM ${tableName} ${order} LIMIT 50`
    );
    const sample: DbRow[] = sampleRes.rows;

    results.push({ name: toDisplayName(tableName), columns, rowCount, sample });
  }

  return { tables: results };
}

export async function getDbPathInfo(): Promise<DbPathInfo> {
  // For Postgres, there's no local file path; perform a simple connectivity check
  let exists = false;
  try {
    await pool.query('SELECT 1');
    exists = true;
  } catch {
    // Connectivity check failed; exists remains false
  }
  return { url: resolvedDbUrl, path: resolvedDbUrl, exists };
}

export async function deleteDbRow(modelName: string, id: string): Promise<void> {
  const key = modelName.toLowerCase();
  const deleteHandler = getRecordOptional(ADMIN_DELETE_HANDLERS, key);
  if (!deleteHandler) throw new Error('Unknown model');

  const deleted = await deleteHandler(id);
  if (deleted === 0) throw new Error('Not found');
}
