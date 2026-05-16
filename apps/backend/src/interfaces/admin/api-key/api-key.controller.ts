import { Controller, Get, Post, Delete, Body, Param, Request, BadRequestException } from '@nestjs/common';
import { ApiKeyService } from '../../../modules/api-key/api-key.service.js';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithKeyResponseDto } from './dto/api-key.dto.js';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  private extractUserId(req: { user?: { userId: string; sub?: string } }): string {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    return userId;
  }

  @Post()
  async create(
    @Body() dto: CreateApiKeyDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ): Promise<ApiKeyWithKeyResponseDto> {
    const userId = this.extractUserId(req);
    return this.apiKeyService.create(dto, userId);
  }

  @Get()
  async findAll(@Request() req: { user?: { userId: string; sub?: string } }): Promise<ApiKeyResponseDto[]> {
    const userId = this.extractUserId(req);
    return this.apiKeyService.findAll(userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ): Promise<{ success: boolean }> {
    const userId = this.extractUserId(req);
    await this.apiKeyService.delete(id, userId);
    return { success: true };
  }
}
