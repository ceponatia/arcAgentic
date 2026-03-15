/**
 * User Preferences API Routes
 *
 * GET/PUT endpoints for the authenticated user's preferences.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  getUserPreferences,
  updateUserPreferences,
  ensureUserRole,
} from '@arcagentic/db/node';
import type { ApiError } from '../../types.js';
import { getAuthUser } from '../../auth/middleware.js';
import { getPrincipalIdentifier } from '../../auth/ownerEmail.js';
import { validateBody } from '../../utils/request-validation.js';

/**
 * Schema for updating preferences
 */
const UpdatePreferencesSchema = z.object({
  workspaceMode: z.enum(['wizard', 'compact']).optional(),
});

const UpdateWorkspaceModeSchema = z.object({
  mode: z.enum(['wizard', 'compact']),
});

/**
 * Register user preference routes.
 */
export function registerUserPreferencesRoutes(app: Hono): void {
  /**
   * GET /user/preferences
   * Get current user preferences
   */
  app.get('/user/preferences', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    try {
      await ensureUserRole(userId, user.role);
      const preferences = await getUserPreferences(userId);
      return c.json({ ok: true, preferences }, 200);
    } catch (err) {
      console.error('[API] Failed to get user preferences:', err);
      return c.json({ ok: false, error: 'failed to get preferences' } satisfies ApiError, 500);
    }
  });

  /**
   * PUT /user/preferences
   * Update user preferences (merges with existing)
   */
  app.put('/user/preferences', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const parsed = await validateBody(c, UpdatePreferencesSchema);
    if (!parsed.success) return parsed.errorResponse;

    try {
      await ensureUserRole(userId, user.role);
      const update =
        parsed.data.workspaceMode !== undefined
          ? { workspaceMode: parsed.data.workspaceMode }
          : {};
      const preferences = await updateUserPreferences(userId, update);
      return c.json({ ok: true, preferences }, 200);
    } catch (err) {
      console.error('[API] Failed to update user preferences:', err);
      return c.json({ ok: false, error: 'failed to update preferences' } satisfies ApiError, 500);
    }
  });

  /**
   * GET /user/preferences/workspace-mode
   * Get just the workspace mode preference
   */
  app.get('/user/preferences/workspace-mode', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    try {
      await ensureUserRole(userId, user.role);
      const preferences = await getUserPreferences(userId);
      const mode = preferences.workspaceMode ?? 'wizard';
      return c.json({ ok: true, mode }, 200);
    } catch (err) {
      console.error('[API] Failed to get workspace mode:', err);
      return c.json({ ok: false, error: 'failed to get workspace mode' } satisfies ApiError, 500);
    }
  });

  /**
   * PUT /user/preferences/workspace-mode
   * Set just the workspace mode preference
   */
  app.put('/user/preferences/workspace-mode', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const parsed = await validateBody(c, UpdateWorkspaceModeSchema);
    if (!parsed.success) return parsed.errorResponse;

    try {
      await ensureUserRole(userId, user.role);
      await updateUserPreferences(userId, { workspaceMode: parsed.data.mode });
      return c.json({ ok: true, mode: parsed.data.mode }, 200);
    } catch (err) {
      console.error('[API] Failed to set workspace mode:', err);
      return c.json({ ok: false, error: 'failed to set workspace mode' } satisfies ApiError, 500);
    }
  });
}
