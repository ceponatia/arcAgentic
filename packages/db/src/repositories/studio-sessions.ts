import { and, eq, lt } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { studioSessions } from '../schema/index.js';
import type { OwnerEmail } from '../types.js';
import { pool } from '../utils/client.js';

export interface StudioSession {
  id: string;
  ownerEmail: OwnerEmail;
  profileSnapshot: Record<string, unknown>;
  conversation: { role: string; content: string; timestamp: string }[];
  summary: string | null;
  inferredTraits: { path: string; value: unknown; confidence: number }[];
  exploredTopics: string[];
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function studioSessionScope(id: string, ownerEmail?: OwnerEmail) {
  return ownerEmail
    ? and(eq(studioSessions.id, id), eq(studioSessions.ownerEmail, ownerEmail))
    : eq(studioSessions.id, id);
}

/**
 * Compatibility guard for the legacy server bootstrap.
 *
 * The studio_sessions table must now come from migrations. This method remains
 * exported so downstream startup code does not have to change immediately.
 */
export async function initStudioSessionsTable(): Promise<void> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    ['public', 'studio_sessions']
  );

  if (!result.rows[0]?.exists) {
    console.warn(
      '[db] studio_sessions table is missing. Run `CI=true pnpm --dir packages/db run db:migrate` before using studio session APIs.'
    );
  }
}

/**
 * Create a new studio session.
 */
export async function createStudioSession(
  id: string,
  profileSnapshot: Record<string, unknown>,
  ownerEmail: OwnerEmail = 'local'
): Promise<StudioSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  const [row] = await db
    .insert(studioSessions)
    .values({
      id,
      ownerEmail,
      profileSnapshot,
      conversation: [],
      summary: null,
      inferredTraits: [],
      exploredTopics: [],
      createdAt: now,
      lastActiveAt: now,
      expiresAt: expiresAt,
    })
    .returning();

  if (!row) throw new Error('Failed to create studio session');

  return row as unknown as StudioSession;
}

/**
 * Get a studio session by ID.
 */
export async function getStudioSession(
  id: string,
  ownerEmail?: OwnerEmail
): Promise<StudioSession | null> {
  const [row] = await db
    .select()
    .from(studioSessions)
    .where(studioSessionScope(id, ownerEmail))
    .limit(1);

  return (row as unknown as StudioSession) || null;
}

/**
 * Update a studio session.
 */
export async function updateStudioSession(
  id: string,
  updates: Partial<{
    profileSnapshot: Record<string, unknown>;
    conversation: { role: string; content: string; timestamp: string }[];
    summary: string | null;
    inferredTraits: { path: string; value: unknown; confidence: number }[];
    exploredTopics: string[];
  }>,
  ownerEmail?: OwnerEmail
): Promise<StudioSession | null> {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  await db
    .update(studioSessions)
    .set({
      ...updates,
      lastActiveAt: now,
      expiresAt: newExpiresAt,
    })
    .where(studioSessionScope(id, ownerEmail));

  return getStudioSession(id, ownerEmail);
}

/**
 * Delete a studio session.
 */
export async function deleteStudioSession(id: string, ownerEmail?: OwnerEmail): Promise<boolean> {
  const result = await db
    .delete(studioSessions)
    .where(studioSessionScope(id, ownerEmail))
    .returning({ id: studioSessions.id });
  return result.length > 0;
}

/**
 * Delete all expired sessions (TTL cleanup).
 * Call this periodically (e.g., on server startup, or via cron).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(studioSessions)
    .where(lt(studioSessions.expiresAt, now))
    .returning({ id: studioSessions.id });
  return result.length;
}
