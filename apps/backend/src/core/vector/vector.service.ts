import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: {
    newsId: string;
    title: string;
    content: string;
    source: string;
    publishTime: string;
  };
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private client: ChromaClient;
  private collection: Collection | null = null;
  private readonly collectionName = 'news_embeddings';

  constructor(private readonly configService: ConfigService) {
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
        metadata: { description: 'News article embeddings' },
      });
    }
    return this.collection;
  }

  async storeNewsEmbedding(document: VectorDocument): Promise<void> {
    try {
      const collection = await this.getCollection();
      await collection.add({
        ids: [document.id],
        embeddings: [document.embedding],
        metadatas: [document.metadata],
      });
      this.logger.log(`Stored embedding for news ${document.metadata.newsId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store embedding: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async storeBatchNewsEmbeddings(documents: VectorDocument[]): Promise<void> {
    if (documents.length === 0) return;

    try {
      const collection = await this.getCollection();
      await collection.add({
        ids: documents.map(d => d.id),
        embeddings: documents.map(d => d.embedding),
        metadatas: documents.map(d => d.metadata),
      });
      this.logger.log(`Stored ${documents.length} embeddings`);
    } catch (error) {
      this.logger.error(
        `Failed to store batch embeddings: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async deleteEmbedding(id: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      await collection.delete({ ids: [id] });
      this.logger.log(`Deleted embedding ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete embedding: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async similaritySearch(
    queryEmbedding: number[],
    nResults: number = 5,
  ): Promise<{ id: string; metadata: Record<string, unknown>; distance: number }[]> {
    try {
      const collection = await this.getCollection();
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
      });

      const ids = results.ids[0] || [];
      const distances = results.distances?.[0] || [];
      const metadatas = results.metadatas?.[0] || [];

      return ids.map((id: string, index: number) => ({
        id,
        metadata: (metadatas[index] as Record<string, unknown>) || {},
        distance: distances[index] || 0,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to search embeddings: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const result = await collection.get({ ids: [id] });
      return result.ids.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check embedding existence: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
