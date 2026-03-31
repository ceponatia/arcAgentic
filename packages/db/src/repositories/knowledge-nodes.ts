import { and, asc, eq, getTableColumns, isNotNull, lt, sql } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { knowledgeNodes } from '../schema/index.js';
import type { OwnerEmail, UUID } from '../types.js';

export interface InsertKnowledgeNodeInput {
  sessionId?: UUID;
  ownerEmail: OwnerEmail;
  actorId?: string;
  nodeType: string;
  content: string;
  summary?: string;
  confidence?: number;
  importance?: number;
  decayRate?: number;
  sourceType?: string;
  sourceEntityId?: string;
  sourceEventId?: UUID;
  embedding?: number[];
}

export interface FindSimilarNodesOptions {
  limit?: number;
  minSimilarity?: number;
}

export type KnowledgeNodeRecord = typeof knowledgeNodes.$inferSelect;

export interface SimilarKnowledgeNodeRecord extends KnowledgeNodeRecord {
  cosineDistance: number;
  similarity: number;
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.max(1, Math.floor(limit ?? 10));
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function serializeEmbeddingLiteral(embedding: number[]): string {
  if (embedding.length === 0) {
    throw new Error('Embedding must contain at least one value.');
  }

  return `'[${embedding
    .map((value) => {
      assertFiniteNumber(value, 'Embedding value');
      return String(value);
    })
    .join(',')}]'`;
}

/**
 * Insert a knowledge node and return the persisted row.
 */
export async function insertKnowledgeNode(
  node: InsertKnowledgeNodeInput
): Promise<KnowledgeNodeRecord> {
  const serializedEmbedding = node.embedding
    ? sql`${sql.raw(serializeEmbeddingLiteral(node.embedding))}::vector`
    : null;

  const [row] = await db
    .insert(knowledgeNodes)
    .values({
      sessionId: node.sessionId,
      ownerEmail: node.ownerEmail,
      actorId: node.actorId,
      nodeType: node.nodeType,
      content: node.content,
      summary: node.summary,
      confidence: node.confidence,
      importance: node.importance,
      decayRate: node.decayRate,
      sourceType: node.sourceType,
      sourceEntityId: node.sourceEntityId,
      sourceEventId: node.sourceEventId,
      embedding: serializedEmbedding,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to insert knowledge node.');
  }

  return row;
}

/**
 * Update a node embedding and refresh the updated timestamp.
 */
export async function updateNodeEmbedding(
  nodeId: UUID,
  embedding: number[]
): Promise<KnowledgeNodeRecord | null> {
  const [row] = await db
    .update(knowledgeNodes)
    .set({
      embedding,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeNodes.id, nodeId))
    .returning();

  return row ?? null;
}

/**
 * Fetch a single knowledge node by its identifier.
 */
export async function getKnowledgeNodeById(nodeId: UUID): Promise<KnowledgeNodeRecord | null> {
  const [row] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.id, nodeId))
    .limit(1);

  return row ?? null;
}

/**
 * List all knowledge nodes stored for a session.
 */
export async function listKnowledgeNodesBySession(
  sessionId: UUID
): Promise<KnowledgeNodeRecord[]> {
  return await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.sessionId, sessionId))
    .orderBy(asc(knowledgeNodes.createdAt), asc(knowledgeNodes.id));
}

/**
 * List all knowledge nodes stored for a specific actor in a session.
 */
export async function listKnowledgeNodesByActor(
  sessionId: UUID,
  actorId: string
): Promise<KnowledgeNodeRecord[]> {
  return await db
    .select()
    .from(knowledgeNodes)
    .where(and(eq(knowledgeNodes.sessionId, sessionId), eq(knowledgeNodes.actorId, actorId)))
    .orderBy(asc(knowledgeNodes.createdAt), asc(knowledgeNodes.id));
}

/**
 * Find the most similar stored nodes for a session using cosine distance.
 */
export async function findSimilarNodes(
  embedding: number[],
  sessionId: UUID,
  options: FindSimilarNodesOptions = {}
): Promise<SimilarKnowledgeNodeRecord[]> {
  const vectorLiteral = sql.raw(serializeEmbeddingLiteral(embedding));
  const cosineDistance = sql<number>`${knowledgeNodes.embedding} <=> ${vectorLiteral}`;
  const similarity = sql<number>`1 - (${cosineDistance})`;
  const limit = normalizeLimit(options.limit);
  const filters = [eq(knowledgeNodes.sessionId, sessionId), isNotNull(knowledgeNodes.embedding)];

  if (options.minSimilarity !== undefined) {
    assertFiniteNumber(options.minSimilarity, 'minSimilarity');
    filters.push(sql`${similarity} >= ${options.minSimilarity}`);
  }

  return await db
    .select({
      ...getTableColumns(knowledgeNodes),
      cosineDistance,
      similarity,
    })
    .from(knowledgeNodes)
    .where(and(...filters))
    .orderBy(asc(cosineDistance), asc(knowledgeNodes.id))
    .limit(limit);
}

/**
 * Update a node's importance score and refresh the updated timestamp.
 */
export async function updateNodeImportance(
  nodeId: UUID,
  importance: number
): Promise<KnowledgeNodeRecord | null> {
  assertFiniteNumber(importance, 'importance');

  const [row] = await db
    .update(knowledgeNodes)
    .set({
      importance,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeNodes.id, nodeId))
    .returning();

  return row ?? null;
}

/**
 * Mark a node as recalled right now and refresh the updated timestamp.
 */
export async function updateNodeLastRecalled(
  nodeId: UUID
): Promise<KnowledgeNodeRecord | null> {
  const now = new Date();
  const [row] = await db
    .update(knowledgeNodes)
    .set({
      lastRecalledAt: now,
      updatedAt: now,
    })
    .where(eq(knowledgeNodes.id, nodeId))
    .returning();

  return row ?? null;
}

/**
 * Delete nodes whose expiration timestamp is in the past.
 */
export async function deleteExpiredNodes(): Promise<KnowledgeNodeRecord[]> {
  const now = new Date();

  return await db
    .delete(knowledgeNodes)
    .where(and(isNotNull(knowledgeNodes.expiresAt), lt(knowledgeNodes.expiresAt, now)))
    .returning();
}