/**
 * Workspace Drafts API Routes
 *
 * Provides CRUD endpoints for persisting in-progress Session Builder state.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  createWorkspaceDraft,
  deleteWorkspaceDraft,
  getWorkspaceDraft,
  listWorkspaceDrafts,
  pruneOldWorkspaceDrafts,
  updateWorkspaceDraft,
} from '@arcagentic/db/node';
import type { ApiError } from '../../types.js';
import { getAuthUser } from '../../auth/middleware.js';
import { getPrincipalIdentifier } from '../../auth/ownerEmail.js';
import { toId } from '../../utils/uuid.js';
import { validateBody, validateParamId } from '../../utils/request-validation.js';

/**
 * Validation schema for workspace state.
 * We intentionally allow unknown shape (builder evolves quickly).
 */
const WorkspaceStateSchema = z.record(z.string(), z.unknown()).optional();

const CreateDraftSchema = z.object({
  name: z.string().optional(),
  workspaceState: WorkspaceStateSchema,
  currentStep: z.string().optional(),
});

const UpdateDraftSchema = z.object({
  name: z.string().nullable().optional(),
  workspaceState: WorkspaceStateSchema,
  currentStep: z.string().optional(),
  validationState: z.record(z.string(), z.unknown()).optional(),
});

interface WorkspaceDraftRecord {
  userId: string;
}

export function registerWorkspaceDraftRoutes(app: Hono): void {
  // GET /workspace-drafts - list drafts for user
  app.get('/workspace-drafts', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }
    const parsedLimit = parseInt(c.req.query('limit') ?? '20', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

    try {
      const drafts = await listWorkspaceDrafts(userId, { limit });
      return c.json({ ok: true, drafts, total: drafts.length }, 200);
    } catch (err) {
      console.error('[API] Failed to list workspace drafts:', err);
      return c.json({ ok: false, error: 'failed to list drafts' } satisfies ApiError, 500);
    }
  });

  // GET /workspace-drafts/:id - get single draft
  app.get('/workspace-drafts/:id', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const idResult = validateParamId(c);
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;
    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    try {
      const draft = (await getWorkspaceDraft(toId(id))) as WorkspaceDraftRecord | null;
      if (!draft) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      if (draft.userId !== userId) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true, draft }, 200);
    } catch (err) {
      console.error('[API] Failed to get workspace draft:', err);
      return c.json({ ok: false, error: 'failed to get draft' } satisfies ApiError, 500);
    }
  });

  // POST /workspace-drafts - create new draft
  app.post('/workspace-drafts', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    let userId: string | undefined;
    try {
      userId = getPrincipalIdentifier(c);
    } catch {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const parsed = await validateBody(c, CreateDraftSchema);
    if (!parsed.success) return parsed.errorResponse;

    const { name, workspaceState, currentStep } = parsed.data;

    try {
      const draft = await createWorkspaceDraft({
        userId,
        ...(name !== undefined ? { name } : {}),
        ...(workspaceState !== undefined ? { workspaceState } : {}),
        ...(currentStep !== undefined ? { currentStep } : {}),
      });

      return c.json({ ok: true, draft }, 201);
    } catch (err) {
      console.error('[API] Failed to create workspace draft:', err);
      return c.json({ ok: false, error: 'failed to create draft' } satisfies ApiError, 500);
    }
  });

  // PUT /workspace-drafts/:id - update draft
  app.put('/workspace-drafts/:id', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const idResult = validateParamId(c);
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;
    let userId: string | undefined;
    try {
      userId = getPrincipalIdentifier(c);
    } catch {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const parsed = await validateBody(c, UpdateDraftSchema);
    if (!parsed.success) return parsed.errorResponse;

    const { name, workspaceState, currentStep, validationState } = parsed.data;

    try {
      const existing = (await getWorkspaceDraft(toId(id))) as WorkspaceDraftRecord | null;
      if (existing?.userId !== userId) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      const draft = await updateWorkspaceDraft(toId(id), {
        ...(name !== undefined ? { name } : {}),
        ...(workspaceState !== undefined ? { workspaceState } : {}),
        ...(currentStep !== undefined ? { currentStep } : {}),
        ...(validationState !== undefined ? { validationState } : {}),
      });

      if (!draft) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      return c.json({ ok: true, draft }, 200);
    } catch (err) {
      console.error('[API] Failed to update workspace draft:', err);
      return c.json({ ok: false, error: 'failed to update draft' } satisfies ApiError, 500);
    }
  });

  // DELETE /workspace-drafts/:id - delete draft
  app.delete('/workspace-drafts/:id', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    const idResult = validateParamId(c);
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;
    const userId = getPrincipalIdentifier(c);
    if (!userId) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    try {
      const existing = (await getWorkspaceDraft(toId(id))) as WorkspaceDraftRecord | null;
      if (existing?.userId !== userId) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      const deleted = await deleteWorkspaceDraft(toId(id));
      if (!deleted) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true }, 200);
    } catch (err) {
      console.error('[API] Failed to delete workspace draft:', err);
      return c.json({ ok: false, error: 'failed to delete draft' } satisfies ApiError, 500);
    }
  });

  // POST /workspace-drafts/prune - cleanup old drafts
  app.post('/workspace-drafts/prune', async (c) => {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ ok: false, error: 'Forbidden' } satisfies ApiError, 403);
    }

    const olderThanDays = parseInt(c.req.query('days') ?? '30', 10);

    try {
      const count = await pruneOldWorkspaceDrafts(olderThanDays);
      return c.json({ ok: true, deleted: count }, 200);
    } catch (err) {
      console.error('[API] Failed to prune workspace drafts:', err);
      return c.json({ ok: false, error: 'failed to prune drafts' } satisfies ApiError, 500);
    }
  });
}
