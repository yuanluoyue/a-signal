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

  @ApiProperty({ description: '置信度阈值 (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceThreshold: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
