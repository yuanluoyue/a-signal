import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithKeyResponseDto } from './dto/api-key.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
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
