import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DbService } from '../../core/db/db.service.js';
import { apiKeys, mcpLogs, type NewApiKey, type ApiKey } from '../../core/db/schema.js';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithKeyResponseDto } from '../../interfaces/admin/api-key/dto/api-key.dto.js';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly dbService: DbService) {}

  private generateApiKey(): string {
    return `ak_${randomBytes(32).toString('hex')}`;
  }

  async create(dto: CreateApiKeyDto): Promise<ApiKeyWithKeyResponseDto> {
    const key = this.generateApiKey();

    const newApiKey: NewApiKey = {
      key,
      name: dto.name,
      status: 'active',
      rateLimit: dto.rateLimit ?? 60,
    };

    const [result] = await this.dbService.db
      .insert(apiKeys)
      .values(newApiKey)
      .returning();

    this.logger.log(`Created API Key: ${result.id} - ${result.name}`);

    return {
      id: result.id,
      key: result.key,
      name: result.name,
      status: result.status,
      rateLimit: result.rateLimit,
      createdAt: result.createdAt,
    };
  }

  async findAll(): Promise<ApiKeyResponseDto[]> {
    const results = await this.dbService.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        status: apiKeys.status,
        rateLimit: apiKeys.rateLimit,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .orderBy(apiKeys.createdAt);

    return results;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const [result] = await this.dbService.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    return result || null;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const [result] = await this.dbService.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, key))
      .limit(1);

    return result || null;
  }

  async delete(id: string): Promise<void> {
    await this.dbService.db
      .delete(mcpLogs)
      .where(eq(mcpLogs.apiKeyId, id));

    await this.dbService.db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id));

    this.logger.log(`Deleted API Key: ${id}`);
  }

  async validateKey(key: string): Promise<ApiKey | null> {
    this.logger.debug(`Validating key: ${key.substring(0, 10)}...`);

    const apiKey = await this.findByKey(key);

    if (!apiKey) {
      this.logger.warn(`API Key not found: ${key.substring(0, 10)}...`);
      return null;
    }

    if (apiKey.status !== 'active') {
      this.logger.warn(`API Key not active: ${key.substring(0, 10)}...`);
      return null;
    }

    this.logger.debug(`API Key validated successfully: ${apiKey.id}`);
    return apiKey;
  }
}
