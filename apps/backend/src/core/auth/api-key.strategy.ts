import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport';
import { Request } from 'express';
import { DbService } from '../db/db.service.js';
import { apiKeys } from '../db/schema.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(private readonly dbService: DbService) {
    super();
  }

  authenticate(req: Request, options?: any): void {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      this.fail(new UnauthorizedException('Missing x-api-key header'), 401);
      return;
    }

    this.validateApiKey(apiKey, req);
  }

  private async validateApiKey(apiKey: string, req: Request): Promise<void> {
    try {
      const [record] = await this.dbService.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKey))
        .limit(1);

      if (!record) {
        this.fail(new UnauthorizedException('Invalid API key'), 401);
        return;
      }

      if (record.status !== 'active') {
        this.fail(new UnauthorizedException('Inactive API key'), 401);
        return;
      }

      this.success(record);
    } catch (error) {
      this.logger.error(`API key validation error: ${error instanceof Error ? error.message : String(error)}`);
      this.fail(new UnauthorizedException('API key validation failed'), 401);
    }
  }

  validate(payload: any): any {
    return payload;
  }
}
