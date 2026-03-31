import {
  findSimilarNodes,
  getKnowledgeNodeById,
  insertKnowledgeNode,
  listKnowledgeNodesBySession,
  updateNodeImportance,
  updateNodeLastRecalled,
  type KnowledgeNodeRecord,
  type SimilarKnowledgeNodeRecord,
} from '@arcagentic/db';

import { extractNodes } from '../extraction/extraction.js';
import {
  applyNarrativeDecay,
  boostNarrativeImportance,
  computeScore,
} from '../scoring/scoring.js';
import type {
  NodeIngestionInput,
  NodeIngestionResult,
  RetrievalConfig,
  RetrievalEmbeddingService,
  RetrievalMetadata,
  RetrievalQuery,
  RetrievalResult,
  RetrievalService,
  ScoredNode,
  ScoringWeights,
} from '../types.js';
import { DEFAULT_RETRIEVAL_CONFIG } from './retrieval-service.js';

/**
 * Database-backed retrieval service using pgvector similarity search.
 */
export class PgRetrievalService implements RetrievalService {
  private readonly config: Required<RetrievalConfig>;
  private readonly embeddingService: RetrievalEmbeddingService;

  constructor(embeddingService: RetrievalEmbeddingService, config: RetrievalConfig = {}) {
    this.embeddingService = embeddingService;
    this.config = {
      ...DEFAULT_RETRIEVAL_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_RETRIEVAL_CONFIG.weights,
        ...config.weights,
      },
    };
  }

  /**
   * Retrieve relevant knowledge nodes for a session query.
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    const weights = this.config.weights as ScoringWeights;
    const maxNodes = query.maxNodes ?? this.config.defaultMaxNodes;
    const minScore = query.minScore ?? this.config.defaultMinScore;
    const queryEmbedding = await this.resolveQueryEmbedding(query);

    const dbResults = await findSimilarNodes(queryEmbedding, query.sessionId, {
      limit: maxNodes,
      minSimilarity: minScore,
    });

    const matchedResults = dbResults.filter((record) => this.matchesQueryScope(record, query));
    const nodes = matchedResults
      .map((record) => this.toScoredNode(record, weights))
      .sort((left, right) => right.score - left.score);

    const metadata: RetrievalMetadata = {
      queryTimeMs: Date.now() - startTime,
      candidatesConsidered: matchedResults.length,
      nodesReturned: nodes.length,
      weights,
    };

    return {
      nodes,
      metadata,
    };
  }

  /**
   * Extract profile nodes, generate embeddings, and persist them to Postgres.
   */
  async ingestNodes(input: NodeIngestionInput): Promise<NodeIngestionResult> {
    const isCharacter = input.characterInstanceId !== undefined;
    const { nodes: extractedNodes, errors } = extractNodes(input.profileJson, input.paths, isCharacter);

    let created = 0;
    const ingestionErrors = [...errors];

    if (!input.sessionId) {
      ingestionErrors.push({
        path: 'sessionId',
        message: 'PgRetrievalService ingest requires a sessionId.',
      });
    }

    if (!input.ownerEmail) {
      ingestionErrors.push({
        path: 'ownerEmail',
        message: 'PgRetrievalService ingest requires an ownerEmail.',
      });
    }

    if (!input.sessionId || !input.ownerEmail) {
      return {
        created,
        updated: 0,
        unchanged: 0,
        errors: ingestionErrors,
      };
    }

    for (const extractedNode of extractedNodes) {
      try {
        const [embedding] = await this.embeddingService.embed([extractedNode.content]);

        if (!embedding) {
          throw new Error('Embedding service returned no embedding.');
        }

        const insertInput: {
          sessionId: string;
          ownerEmail: string;
          actorId?: string;
          nodeType: string;
          content: string;
          importance: number;
          sourceType: string;
          sourceEntityId?: string;
          embedding: number[];
        } = {
          sessionId: input.sessionId,
          ownerEmail: input.ownerEmail,
          nodeType: extractedNode.path,
          content: extractedNode.content,
          importance: extractedNode.baseImportance,
          sourceType: isCharacter ? 'character-profile' : 'setting-profile',
          embedding,
        };

        if (input.characterInstanceId) {
          insertInput.actorId = input.characterInstanceId;
        }

        const sourceEntityId = input.characterInstanceId ?? input.settingInstanceId;
        if (sourceEntityId) {
          insertInput.sourceEntityId = sourceEntityId;
        }

        await insertKnowledgeNode(insertInput);
        created++;
      } catch (error) {
        ingestionErrors.push({
          path: extractedNode.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      created,
      updated: 0,
      unchanged: 0,
      errors: ingestionErrors,
    };
  }

  /**
   * Boost stored node importance and mark those nodes as recently recalled.
   */
  async updateSalience(nodeIds: string[], boost: number): Promise<void> {
    for (const nodeId of nodeIds) {
      const record = await getKnowledgeNodeById(nodeId);

      if (!record) {
        continue;
      }

      const currentImportance = typeof record.importance === 'number' ? record.importance : 0;
      const nextImportance = boostNarrativeImportance(currentImportance, boost);

      await updateNodeImportance(nodeId, nextImportance);
      await updateNodeLastRecalled(nodeId);
    }
  }

  /**
   * Apply importance decay to all nodes in a session.
   */
  async applyDecay(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const records = await listKnowledgeNodesBySession(sessionId);

    for (const record of records) {
      const currentImportance = typeof record.importance === 'number' ? record.importance : 0;
      const decayedImportance = applyNarrativeDecay(
        currentImportance,
        this.config.narrativeDecayFactor
      );

      await updateNodeImportance(record.id, decayedImportance);
    }
  }

  private async resolveQueryEmbedding(query: RetrievalQuery): Promise<number[]> {
    if (query.queryEmbedding) {
      return query.queryEmbedding;
    }

    const [embedding] = await this.embeddingService.embed([query.queryText]);

    if (!embedding) {
      throw new Error('Embedding service returned no query embedding.');
    }

    return embedding;
  }

  private matchesQueryScope(record: SimilarKnowledgeNodeRecord, query: RetrievalQuery): boolean {
    if (query.characterInstanceId && record.actorId !== query.characterInstanceId) {
      return false;
    }

    if (query.settingInstanceId && record.sourceEntityId !== query.settingInstanceId) {
      return false;
    }

    return true;
  }

  private toScoredNode(record: SimilarKnowledgeNodeRecord, weights: ScoringWeights): ScoredNode {
    const node = this.toKnowledgeNode(record);
    const totalImportance = typeof record.importance === 'number' ? record.importance : 0;
    const score = computeScore(record.similarity, totalImportance, weights);

    return {
      node,
      similarity: record.similarity,
      totalImportance,
      score,
    };
  }

  private toKnowledgeNode(record: KnowledgeNodeRecord): ScoredNode['node'] {
    return {
      id: record.id,
      path: record.nodeType,
      content: record.content,
      baseImportance: typeof record.importance === 'number' ? record.importance : 0,
      narrativeImportance: 0,
      createdAt: this.toDate(record.createdAt),
      updatedAt: this.toDate(record.updatedAt),
      ...(record.lastRecalledAt ? { lastAccessedAt: this.toDate(record.lastRecalledAt) } : {}),
    };
  }

  private toDate(value: Date | string | null): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      return new Date(value);
    }

    return new Date(0);
  }
}
