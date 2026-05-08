import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
