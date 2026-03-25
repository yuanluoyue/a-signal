import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service.js';
import { apiKeys, mcpLogs, type NewApiKey, type ApiKey } from '../database/schema.js';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithKeyResponseDto } from './dto/api-key.dto.js';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 生成随机的 API Key
   */
  private generateApiKey(): string {
    return `ak_${randomBytes(32).toString('hex')}`;
  }

  /**
   * 创建新的 API Key
   */
  async create(dto: CreateApiKeyDto): Promise<ApiKeyWithKeyResponseDto> {
    const key = this.generateApiKey();
    
    const newApiKey: NewApiKey = {
      key,
      name: dto.name,
      status: 'active',
      rateLimit: dto.rateLimit ?? 60,
    };

    const [result] = await this.databaseService.db
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

  /**
   * 获取所有 API Keys（不包含 key 值）
   */
  async findAll(): Promise<ApiKeyResponseDto[]> {
    const results = await this.databaseService.db
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

  /**
   * 根据 ID 获取 API Key
   */
  async findById(id: string): Promise<ApiKey | null> {
    const [result] = await this.databaseService.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    return result || null;
  }

  /**
   * 根据 key 值获取 API Key
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    const [result] = await this.databaseService.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, key))
      .limit(1);

    return result || null;
  }

  /**
   * 删除 API Key
   */
  async delete(id: string): Promise<void> {
    // 先删除关联的 MCP 日志记录
    await this.databaseService.db
      .delete(mcpLogs)
      .where(eq(mcpLogs.apiKeyId, id));

    // 再删除 API Key
    await this.databaseService.db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id));

    this.logger.log(`Deleted API Key: ${id}`);
  }

  /**
   * 验证 API Key 是否有效
   */
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
