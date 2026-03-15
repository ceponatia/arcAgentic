import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { worldBus } from '@arcagentic/bus';
import { type WorldEvent } from '@arcagentic/schemas';
import { getSession } from '@arcagentic/db/node';
import { getOwnerEmail } from '../auth/ownerEmail.js';
import { safeJsonStringify } from '../utils/json.js';
import { validateParamId } from '../utils/request-validation.js';
import { toSessionId } from '../utils/uuid.js';

const router = new Hono();

/**
 * SSE endpoint for streaming world events to clients.
 * Filters by session_id if provided.
 */
router.get('/:sessionId', async (c) => {
  const sessionIdResult = validateParamId(c, 'sessionId');
  if (!sessionIdResult.success) return sessionIdResult.errorResponse;

  const sessionId = sessionIdResult.data;
  const ownerEmail = getOwnerEmail(c);
  const session = await getSession(toSessionId(sessionId), ownerEmail);

  if (!session) {
    return c.json({ ok: false, error: 'session not found' }, 404);
  }

  return streamSSE(c, async (stream) => {
    const handler = async (event: WorldEvent) => {
      // Filter by session if applicable
      const rawEvent = event as Record<string, unknown>;
      const payload = rawEvent['payload'] as Record<string, unknown> | undefined;
      const eventSessionId =
        (rawEvent['sessionId'] as string | undefined) ??
        (payload?.['sessionId'] as string | undefined);

      if (eventSessionId && eventSessionId !== sessionId) {
        return;
      }

      await stream.writeSSE({
        data: safeJsonStringify(event),
        event: event.type,
        id: (rawEvent['id'] as string | number | undefined)?.toString() ?? Date.now().toString(),
      });
    };

    await worldBus.subscribe(handler);

    c.req.raw.signal.addEventListener('abort', () => {
      worldBus.unsubscribe(handler);
    });

    while (!c.req.raw.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });
});

export default router;
