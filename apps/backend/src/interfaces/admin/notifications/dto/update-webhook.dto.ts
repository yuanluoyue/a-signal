import { IsString, IsEnum, IsNumber, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookType } from './create-webhook.dto.js';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook 名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Webhook 类型', enum: WebhookType })
  @IsOptional()
  @IsEnum(WebhookType)
  type?: WebhookType;

  @ApiPropertyOptional({ description: '最小分数绝对值 (0 到 1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({ description: '最大分数绝对值 (0 到 1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxScore?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
