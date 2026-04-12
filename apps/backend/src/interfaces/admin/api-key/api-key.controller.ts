import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiKeyService } from '../../../modules/api-key/api-key.service.js';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithKeyResponseDto } from './dto/api-key.dto.js';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto): Promise<ApiKeyWithKeyResponseDto> {
    return this.apiKeyService.create(dto);
  }

  @Get()
  async findAll(): Promise<ApiKeyResponseDto[]> {
    return this.apiKeyService.findAll();
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.apiKeyService.delete(id);
    return { success: true };
  }
}
