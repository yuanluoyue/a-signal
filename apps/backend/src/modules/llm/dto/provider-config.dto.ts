import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateProviderConfigDto {
  @ApiProperty({ description: 'Provider 名称' })
  @IsString()
  provider: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'API Key' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API 基础 URL' })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '默认模型' })
  @IsString()
  @IsOptional()
  defaultModel?: string;

  @ApiPropertyOptional({ description: '每分钟请求限制' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  rpmLimit?: number;

  @ApiPropertyOptional({ description: '每日 Token 预算' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyBudget?: number;
}

export class UpdateProviderConfigDto {
  @ApiPropertyOptional({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'API Key' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API 基础 URL' })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '默认模型' })
  @IsString()
  @IsOptional()
  defaultModel?: string;

  @ApiPropertyOptional({ description: '每分钟请求限制' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  rpmLimit?: number;

  @ApiPropertyOptional({ description: '每日 Token 预算' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyBudget?: number;
}
