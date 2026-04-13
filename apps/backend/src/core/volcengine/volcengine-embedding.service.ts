import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VOLCENGINE_EMBEDDING_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal';
const EMBEDDING_MODEL = 'doubao-embedding-vision-251215';

export interface EmbeddingInput {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  index: number;
  object: string;
}

@Injectable()
export class VolcengineEmbeddingService {
  private readonly logger = new Logger(VolcengineEmbeddingService.name);

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('VOLCENGINE_API_KEY');
    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const apiKey = this.getApiKey();

    const input: EmbeddingInput[] = [
      {
        type: 'text',
        text: text,
      },
    ];

    const requestBody = {
      model: EMBEDDING_MODEL,
      input,
    };

    this.logger.log(`[VolcengineEmbedding] Request: ${JSON.stringify(requestBody).substring(0, 200)}...`);
    this.logger.log(`[VolcengineEmbedding] API Key: ${apiKey.substring(0, 10)}...`);

    try {
      const response = await fetch(VOLCENGINE_EMBEDDING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Volcengine Embedding API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const rawData = await response.json();

      const data = rawData as {
        data?: {
          embedding?: number[];
          index?: number;
          object?: string;
        };
        error?: {
          message?: string;
        };
        usage?: {
          prompt_tokens: number;
          total_tokens: number;
        };
      };

      if (data.error) {
        throw new Error(`Volcengine Embedding API error: ${data.error.message}`);
      }

      if (!data.data || typeof data.data !== 'object') {
        throw new Error('Invalid embedding response: missing data object');
      }

      this.logger.log(`[VolcengineEmbedding] data keys: ${Object.keys(data.data).join(', ')}`);

      if (!data.data.embedding || !Array.isArray(data.data.embedding)) {
        this.logger.error(`[VolcengineEmbedding] data content: ${JSON.stringify(data.data)}`);
        throw new Error('Invalid embedding response: data.embedding is not an array');
      }

      const embedding = data.data.embedding;
      this.logger.log(`[VolcengineEmbedding] Successfully generated embedding with ${embedding.length} dimensions`);

      this.logger.debug(`Generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      this.logger.error(
        `Failed to get text embedding: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getBatchTextEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (const text of texts) {
      try {
        const embedding = await this.getTextEmbedding(text);
        results.push(embedding);
      } catch (error) {
        this.logger.error(`Failed to get embedding for text: ${text.substring(0, 50)}...`);
        throw error;
      }
    }

    return results;
  }
}
