import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiKeyService } from '../api-key/api-key.service.js';

@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly logger = new Logger(McpAuthGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 打印所有 headers 用于调试
    this.logger.debug(`All headers: ${JSON.stringify(request.headers)}`);
    
    // Express 会将 headers 转换为小写
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      this.logger.warn('Missing x-api-key header');
      throw new UnauthorizedException('Missing x-api-key header');
    }
    
    this.logger.debug(`API Key received: ${apiKey.substring(0, 10)}...`);

    const validKey = await this.apiKeyService.validateKey(apiKey);
    if (!validKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // 将 apiKey 信息附加到请求对象，供后续使用
    request.apiKey = validKey;

    return true;
  }
}
