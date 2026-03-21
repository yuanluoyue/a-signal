import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookType {
  WECHAT = 'wechat',
}

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

  @ApiPropertyOptional({ description: '最小置信度 (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @ApiPropertyOptional({ description: '最大置信度 (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxConfidence?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
