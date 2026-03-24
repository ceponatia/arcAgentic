/**
 * User Account Database Functions
 *
 * Minimal implementation for storing user preferences.
 * Full authentication not implemented yet.
 */
import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { userAccounts } from '../schema/index.js';
import type { UserPreferences, UserRole, UserAccount } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * User preferences stored in the database.
 */

/**
 * User account record.
 */

type UserAccountRow = typeof userAccounts.$inferSelect;

// =============================================================================
// Helpers
// =============================================================================

function toIsoDate(v: unknown): string {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? new Date().toISOString() : v.toISOString();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function isUserPreferences(value: unknown): value is UserPreferences {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePreferences(raw: unknown): UserPreferences {
  if (isUserPreferences(raw)) {
    return raw;
  }

  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isUserPreferences(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return {};
}

function rowToUserAccount(row: UserAccountRow): UserAccount {
  const role = row.role === 'admin' ? 'admin' : 'user';

  return {
    id: row.id,
    identifier: row.identifier,
    displayName: row.displayName,
    role,
    authProvider: 'local',
    preferences: parsePreferences(row.preferences),
    lastLoginAt: row.lastLoginAt ? toIsoDate(row.lastLoginAt) : null,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  };
}

function readPasswordHash(row: UserAccountRow): string | null {
  const v = row.passwordHash;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function getUserAccountRowByIdentifier(identifier: string): Promise<UserAccountRow | null> {
  const [row] = await db
    .select()
    .from(userAccounts)
    .where(eq(userAccounts.identifier, identifier))
    .limit(1);

  return row ?? null;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptKey(password, salt, 64, { N: 16384, r: 8, p: 1 });

  // Format: scrypt:N:r:p:saltB64:keyB64
  return `scrypt:16384:8:1:${salt.toString('base64')}:${key.toString('base64')}`;
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split(':');
  if (parts.length !== 6) return false;
  const algo = parts[0];
  if (algo !== 'scrypt') return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4] ?? '';
  const keyB64 = parts[5] ?? '';

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (!saltB64 || !keyB64) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64');
    expected = Buffer.from(keyB64, 'base64');
  } catch {
    return false;
  }

  const actual = await scryptKey(password, salt, expected.length, { N: n, r, p });

  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function scryptKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

// =============================================================================
// User Account Functions
// =============================================================================

/**
 * Get a user account by identifier.
 * Creates the default user if it doesn't exist.
 */
export async function getUserByIdentifier(identifier: string): Promise<UserAccount | null> {
  const row = await getUserAccountRowByIdentifier(identifier);
  return row ? rowToUserAccount(row) : null;
}

export async function getUserRoleByIdentifier(identifier: string): Promise<UserRole | null> {
  const [row] = await db
    .select({ role: userAccounts.role })
    .from(userAccounts)
    .where(eq(userAccounts.identifier, identifier))
    .limit(1);

  if (!row) return null;
  return row.role === 'admin' ? 'admin' : 'user';
}

/**
 * Get or create the default user account.
 * Used for single-user mode before authentication is implemented.
 */
export async function getOrCreateDefaultUser(): Promise<UserAccount> {
  const existing = await getUserByIdentifier('default');
  if (existing) {
    return existing;
  }

  const [row] = await db
    .insert(userAccounts)
    .values({
      identifier: 'default',
      displayName: 'Default User',
      preferences: { workspaceMode: 'wizard' },
    })
    .onConflictDoUpdate({
      target: userAccounts.identifier,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create default user');
  }

  return rowToUserAccount(row);
}

export async function ensureUserRole(identifier: string, role: UserRole): Promise<void> {
  await db
    .insert(userAccounts)
    .values({
      identifier,
      displayName: null,
      preferences: {},
      role,
      authProvider: 'local',
    })
    .onConflictDoUpdate({
      target: userAccounts.identifier,
      set: {
        role,
        updatedAt: new Date(),
      },
    });
}

/**
 * Ensure a user row exists for a given email.
 *
 * This is primarily used by multi-tenant tables that reference `user_accounts.email`
 * via foreign keys (e.g. sessions.owner_email).
 */
export async function ensureUserByEmail(options: {
  email: string;
  identifier?: string;
  displayName?: string | null;
  role?: UserRole;
}): Promise<UserAccount> {
  const email = options.email.trim().toLowerCase();
  const identifier = (options.identifier ?? email).trim();
  const displayName = options.displayName ?? null;
  const role = options.role ?? 'user';

  const [row] = await db
    .insert(userAccounts)
    .values({
      email,
      identifier,
      displayName,
      preferences: {},
      role,
      authProvider: 'local',
    })
    .onConflictDoUpdate({
      target: userAccounts.email,
      set: {
        identifier,
        displayName: sql`coalesce(${displayName}, ${userAccounts.displayName})`,
        role,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error(`Failed to ensure user by email: ${email}`);
  }

  return rowToUserAccount(row);
}

export async function ensureLocalAdminUser(options: {
  identifier?: string;
  displayName?: string;
  password: string;
}): Promise<UserAccount> {
  const identifier = options.identifier ?? 'admin';
  const displayName = options.displayName ?? 'Admin';

  await db
    .insert(userAccounts)
    .values({
      identifier,
      displayName,
      preferences: {},
      role: 'admin',
      authProvider: 'local',
    })
    .onConflictDoUpdate({
      target: userAccounts.identifier,
      set: {
        role: 'admin',
        updatedAt: new Date(),
      },
    });

  const row = await getUserAccountRowByIdentifier(identifier);
  if (!row) {
    throw new Error('Failed to load ensured local admin user');
  }

  const existingHash = readPasswordHash(row);
  if (!existingHash) {
    const passwordHash = await hashPassword(options.password);
    await db
      .update(userAccounts)
      .set({
        passwordHash,
        lastLoginAt: row.lastLoginAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userAccounts.identifier, identifier));
  }

  const updated = await getUserByIdentifier(identifier);
  if (!updated) {
    throw new Error('Failed to ensure local admin user');
  }
  return updated;
}

export async function verifyLocalUserPassword(options: {
  identifier: string;
  password: string;
}): Promise<{ ok: true; user: UserAccount } | { ok: false; error: 'invalid-credentials' }> {
  const row = await getUserAccountRowByIdentifier(options.identifier);
  if (!row) return { ok: false, error: 'invalid-credentials' };

  const passwordHash = readPasswordHash(row);
  if (!passwordHash) return { ok: false, error: 'invalid-credentials' };

  const ok = await verifyPassword(options.password, passwordHash);
  if (!ok) return { ok: false, error: 'invalid-credentials' };

  const lastLoginAt = new Date();
  await db
    .update(userAccounts)
    .set({ lastLoginAt, updatedAt: new Date() })
    .where(eq(userAccounts.identifier, options.identifier));

  return { ok: true, user: rowToUserAccount({ ...row, lastLoginAt }) };
}

/**
 * Get user preferences by identifier.
 * Returns default preferences if user doesn't exist.
 */
export async function getUserPreferences(identifier = 'default'): Promise<UserPreferences> {
  const user = await getUserByIdentifier(identifier);
  return user?.preferences ?? { workspaceMode: 'wizard' };
}

/**
 * Update user preferences.
 * Merges with existing preferences (does not replace).
 */
export async function updateUserPreferences(
  identifier: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  // Ensure user exists
  if (identifier === 'default') {
    await getOrCreateDefaultUser();
  }

  const row = await getUserAccountRowByIdentifier(identifier);
  if (!row) {
    throw new Error(`User not found: ${identifier}`);
  }

  const nextPreferences = {
    ...parsePreferences(row.preferences),
    ...preferences,
  } satisfies UserPreferences;

  const [updated] = await db
    .update(userAccounts)
    .set({
      preferences: nextPreferences,
      updatedAt: new Date(),
    })
    .where(eq(userAccounts.identifier, identifier))
    .returning({ preferences: userAccounts.preferences });

  if (!updated) {
    throw new Error(`User not found: ${identifier}`);
  }

  return parsePreferences(updated.preferences);
}

/**
 * Set the workspace mode preference.
 * Convenience function for the common use case.
 */
export async function setWorkspaceModePreference(
  identifier: string,
  mode: 'wizard' | 'compact'
): Promise<void> {
  await updateUserPreferences(identifier, { workspaceMode: mode });
}

/**
 * Get the workspace mode preference.
 * Returns 'wizard' if not set.
 */
export async function getWorkspaceModePreference(
  identifier = 'default'
): Promise<'wizard' | 'compact'> {
  const prefs = await getUserPreferences(identifier);
  return prefs.workspaceMode ?? 'wizard';
}
