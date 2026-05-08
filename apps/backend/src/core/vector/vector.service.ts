import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';
import { pipeline, env } from '@xenova/transformers';
import * as path from 'path';
import * as fs from 'fs';

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
  private readonly MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  private extractor: any = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('CHROMA_HOST') || 'localhost';
    const port = this.configService.get<string>('CHROMA_PORT') || '8000';
    this.client = new ChromaClient({
      path: `http://${host}:${port}`,
    });

    this.configureModelCache();
  }

  private configureModelCache(): void {
    const cacheDir = path.join(process.cwd(), '.model-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    env.cacheDir = cacheDir;
    
    const hfMirror = this.configService.get<string>('HF_MIRROR') || 'https://hf-mirror.com';
    env.remoteHost = hfMirror;
    
    this.logger.log(`Model cache directory: ${cacheDir}`);
    this.logger.log(`Using Hugging Face mirror: ${hfMirror}`);
  }

  private async initializeModel(): Promise<void> {
    if (this.extractor) return;

    this.logger.log('Initializing embedding model...');
    this.extractor = await pipeline('feature-extraction', this.MODEL_NAME);
    this.logger.log('Embedding model initialized successfully');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initializeModel();

    try {
      this.logger.log(`Generating embedding for text (${text.length} chars)`);
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data) as number[];
      this.logger.log(`Generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      results.push(embedding);
    }
    return results;
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
