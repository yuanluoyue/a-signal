import { IsString, IsEnum, IsNumber, Min, Max, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiProperty({ description: '最小分数绝对值 (0 到 1)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore: number = 0;

  @ApiProperty({ description: '最大分数绝对值 (0 到 1)', default: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  maxScore: number = 1;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
