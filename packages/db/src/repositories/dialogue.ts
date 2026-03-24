/**
 * Dialogue tree repository helpers.
 */
import { and, desc, eq } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { dialogueState, dialogueTrees } from '../schema/index.js';
import type { UUID } from '../types.js';
import type { DialogueStateRecord, DialogueTreeRecord } from './types.js';

/**
 * Fetch all active dialogue trees for an NPC.
 */
export async function getDialogueTrees(npcId: string): Promise<DialogueTreeRecord[]> {
  return (await db
    .select()
    .from(dialogueTrees)
    .where(and(eq(dialogueTrees.npcId, npcId), eq(dialogueTrees.isActive, true)))
    .orderBy(desc(dialogueTrees.priority))) as DialogueTreeRecord[];
}

/**
 * Get or create dialogue state for a session/NPC pair.
 */
export async function getOrCreateDialogueState(
  sessionId: UUID,
  npcId: string,
  treeId: UUID,
  startNodeId?: string
): Promise<DialogueStateRecord> {
  const [existing] = await db
    .select()
    .from(dialogueState)
    .where(and(eq(dialogueState.sessionId, sessionId), eq(dialogueState.npcId, npcId)))
    .limit(1);

  const resolvedStartNodeId = startNodeId ?? null;
  const visitedNodes = resolvedStartNodeId ? [resolvedStartNodeId] : [];

  if (existing) {
    if (existing.treeId !== treeId) {
      const [updated] = await db
        .update(dialogueState)
        .set({
          treeId,
          currentNodeId: resolvedStartNodeId,
          visitedNodes,
          updatedAt: new Date(),
        })
        .where(eq(dialogueState.id, existing.id))
        .returning();

      if (!updated) throw new Error('failed to update dialogue state');
      return updated as DialogueStateRecord;
    }

    return existing as DialogueStateRecord;
  }

  const [created] = await db
    .insert(dialogueState)
    .values({
      sessionId,
      npcId,
      treeId,
      currentNodeId: resolvedStartNodeId,
      visitedNodes,
    })
    .returning();

  if (!created) throw new Error('failed to create dialogue state');
  return created as DialogueStateRecord;
}

/**
 * Update dialogue state for a specific record.
 */
export async function updateDialogueState(
  state: Pick<DialogueStateRecord, 'id' | 'currentNodeId' | 'visitedNodes'>
): Promise<DialogueStateRecord> {
  const [updated] = await db
    .update(dialogueState)
    .set({
      currentNodeId: state.currentNodeId,
      visitedNodes: state.visitedNodes,
      updatedAt: new Date(),
    })
    .where(eq(dialogueState.id, state.id))
    .returning();

  if (!updated) throw new Error('failed to update dialogue state');
  return updated as DialogueStateRecord;
}

/**
 * Clear dialogue state for a session/NPC pair.
 */
export async function clearDialogueState(sessionId: UUID, npcId: string): Promise<boolean> {
  const deleted = await db
    .delete(dialogueState)
    .where(and(eq(dialogueState.sessionId, sessionId), eq(dialogueState.npcId, npcId)))
    .returning({ id: dialogueState.id });

  return deleted.length > 0;
}
