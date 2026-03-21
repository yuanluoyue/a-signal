import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookType {
  WECHAT = 'wechat',
}

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook 名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Webhook URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Webhook 类型', enum: WebhookType })
  @IsEnum(WebhookType)
  type: WebhookType;

  @ApiProperty({ description: '最小置信度 (0-100)', default: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  minConfidence: number = 0;

  @ApiProperty({ description: '最大置信度 (0-100)', default: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  maxConfidence: number = 100;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
