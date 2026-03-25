import { OpenAI } from 'openai';

export interface EmbeddingService {
  embed(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string;
  dimensions?: number;
  baseURL?: string;
}

/**
 * OpenAI-backed embedding adapter for retrieval consumers that need vector generation.
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: OpenAIEmbeddingConfig) {
    this.model = config.model ?? 'text-embedding-3-small';
    this.dimensions = config.dimensions ?? 1536;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  /**
   * Generates embedding vectors for the provided texts.
   */
  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI embedding request failed: ${message}`);
    }
  }

  /**
   * Returns the configured embedding dimensionality.
   */
  getDimensions(): number {
    return this.dimensions;
  }
}