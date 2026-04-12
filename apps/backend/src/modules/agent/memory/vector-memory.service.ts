import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';
import { VolcengineEmbeddingService } from '../../../core/volcengine/volcengine-embedding.service.js';

export interface VectorMemoryMetadata {
  userId: string;
  sessionId: string;
  type: 'analysis' | 'qa' | 'summary';
  topic: string;
  createdAt: string;
  [key: string]: string;
}

export interface VectorMemoryDocument {
  id: string;
  content: string;
  metadata: VectorMemoryMetadata;
}

@Injectable()
export class VectorMemoryService {
  private readonly logger = new Logger(VectorMemoryService.name);
  private client: ChromaClient;
  private collection: Collection | null = null;
  private readonly collectionName = 'agent_memories';

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: VolcengineEmbeddingService,
  ) {
    const host = this.configService.get<string>('CHROMA_HOST') || 'localhost';
    const port = this.configService.get<string>('CHROMA_PORT') || '8000';
    this.client = new ChromaClient({
      path: `http://${host}:${port}`,
    });
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Agent long-term memory storage' },
      });
    }
    return this.collection;
  }

  async saveMemory(
    content: string,
    metadata: VectorMemoryMetadata,
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      const embedding = await this.embeddingService.getTextEmbedding(content);
      const id = `${metadata.userId}_${metadata.sessionId}_${Date.now()}`;

      await collection.add({
        ids: [id],
        embeddings: [embedding],
        metadatas: [metadata],
        documents: [content],
      });

      this.logger.debug(`[VectorMemoryService] Saved memory: ${id}`);
    } catch (error) {
      this.logger.error(
        `[VectorMemoryService] Failed to save memory: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async searchRelevantMemories(
    query: string,
    userId: string,
    nResults: number = 5,
  ): Promise<string[]> {
    try {
      const collection = await this.getCollection();
      const queryEmbedding = await this.embeddingService.getTextEmbedding(query);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        where: { userId },
      });

      const documents = results.documents?.[0] || [];
      return documents.filter((doc): doc is string => doc !== null);
    } catch (error) {
      this.logger.error(
        `[VectorMemoryService] Failed to search memories: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async deleteUserMemories(userId: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      await collection.delete({
        where: { userId },
      });

      this.logger.log(`[VectorMemoryService] Deleted memories for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `[VectorMemoryService] Failed to delete memories: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
