import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { McpService } from './mcp.service.js';

@Injectable()
export class McpGuard implements CanActivate {
  private readonly logger = new Logger(McpGuard.name);

  constructor(private readonly mcpService: McpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('[McpGuard] No API key provided');
      throw new UnauthorizedException('API key is required');
    }

    const apiKeyId = await this.mcpService.validateApiKey(apiKey);

    if (!apiKeyId) {
      this.logger.warn('[McpGuard] Invalid API key');
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKeyId = apiKeyId;
    this.logger.debug(`[McpGuard] Valid API key: ${apiKeyId}`);

    return true;
  }

  private extractApiKey(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const queryKey = request.query?.api_key;
    if (queryKey) {
      return queryKey;
    }

    const headerKey = request.headers?.['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    return null;
  }
}
