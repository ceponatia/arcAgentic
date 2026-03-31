import {
  findSimilarNodes,
  updateNodeLastRecalled,
  type SimilarKnowledgeNodeRecord,
} from '@arcagentic/db';

import { computeScore } from '../scoring/scoring.js';
import type { RetrievalEmbeddingService, ScoringWeights } from '../types.js';
import type { EpisodicMemorySummary, EpisodicRecallQuery } from './types.js';

const DEFAULT_MAX_NODES = 5;
const DEFAULT_MIN_SCORE = 0.3;
const CANDIDATE_MULTIPLIER = 4;
const MIN_CANDIDATE_LIMIT = 20;
const RECENCY_WINDOW_DAYS = 14;
const EPISODIC_RECALL_WEIGHTS: ScoringWeights = {
  similarity: 0.7,
  importance: 0.25,
};
const RECENCY_WEIGHT = 0.05;
const MINIMUM_KEYWORD_OVERLAP = 1;
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'it',
  'its',
  'this',
  'that',
  'and',
  'or',
  'but',
  'not',
  'no',
  'so',
  'if',
  'then',
  'than',
  'i',
  'me',
  'my',
  'you',
  'your',
  'he',
  'she',
  'they',
  'we',
  'him',
  'her',
  'his',
  'them',
  'their',
  'our',
  'us',
]);

/**
 * Recall prior episodic memories for the current NPC situation.
 */
export async function recallEpisodicMemories(
  query: EpisodicRecallQuery,
  embeddingService: RetrievalEmbeddingService
): Promise<EpisodicMemorySummary[]> {
  const maxNodes = normalizeMaxNodes(query.maxNodes);
  const minScore = query.minScore ?? DEFAULT_MIN_SCORE;
  const [queryEmbedding] = await embeddingService.embed([query.queryText]);

  if (!queryEmbedding) {
    throw new Error('Embedding service returned no query embedding.');
  }

  const candidateLimit = Math.max(maxNodes * CANDIDATE_MULTIPLIER, MIN_CANDIDATE_LIMIT);
  const candidates = await findSimilarNodes(queryEmbedding, query.sessionId, {
    limit: candidateLimit,
  });

  const recalledMemories = candidates
    .filter((record) => matchesRecallScope(record, query))
    .map((record) => ({
      record,
      score: computeRecallScore(record),
    }))
    .filter((candidate) => candidate.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .filter((candidate) => passesRelevanceGate(candidate.record.content, query.queryText))
    .slice(0, maxNodes);

  await Promise.all(
    recalledMemories.map(({ record }) => updateNodeLastRecalled(record.id))
  );

  return recalledMemories.map(({ record }) => ({
    nodeId: record.id,
    content: record.content,
    importance: typeof record.importance === 'number' ? record.importance : 0,
    ...(record.learnedAt ? { learnedAt: toDate(record.learnedAt) } : {}),
  }));
}

function normalizeMaxNodes(maxNodes: number | undefined): number {
  if (!Number.isFinite(maxNodes)) {
    return DEFAULT_MAX_NODES;
  }

  return Math.max(1, Math.floor(maxNodes ?? DEFAULT_MAX_NODES));
}

function matchesRecallScope(
  record: SimilarKnowledgeNodeRecord,
  query: EpisodicRecallQuery
): boolean {
  return (
    record.sessionId === query.sessionId &&
    record.actorId === query.actorId &&
    record.nodeType === 'episodic'
  );
}

function computeRecallScore(record: SimilarKnowledgeNodeRecord): number {
  const importance = typeof record.importance === 'number' ? record.importance : 0;
  const baseScore = computeScore(record.similarity, importance, EPISODIC_RECALL_WEIGHTS);
  const recencyBoost = computeRecencyBoost(record.learnedAt);

  return baseScore + recencyBoost * RECENCY_WEIGHT;
}

/**
 * Lightweight conversational relevance gate.
 * Ensures recalled memories share at least some semantic overlap with the query context.
 * This complements embedding similarity by catching edge cases where cosine distance
 * is high but the memory is topically unrelated.
 */
function passesRelevanceGate(memoryContent: string, queryText: string): boolean {
  const queryTokens = extractContentTokens(queryText);
  if (queryTokens.size === 0) {
    return true;
  }

  const memoryTokens = extractContentTokens(memoryContent);
  let overlapCount = 0;

  for (const token of memoryTokens) {
    if (!queryTokens.has(token)) {
      continue;
    }

    overlapCount += 1;
    if (overlapCount >= MINIMUM_KEYWORD_OVERLAP) {
      return true;
    }
  }

  return false;
}

function extractContentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function computeRecencyBoost(learnedAt: Date | string | null): number {
  const learnedDate = toOptionalDate(learnedAt);

  if (!learnedDate) {
    return 0;
  }

  const elapsedMs = Date.now() - learnedDate.getTime();
  if (elapsedMs <= 0) {
    return 1;
  }

  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - elapsedDays / RECENCY_WINDOW_DAYS);
}

function toOptionalDate(value: Date | string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}
