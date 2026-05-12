import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStrategyRuntimeDto {
  @ApiPropertyOptional({ description: '绑定的 Webhook ID' })
  @IsOptional()
  @IsString()
  webhookId?: string;

  @ApiPropertyOptional({ description: '是否启用 Webhook 推送' })
  @IsOptional()
  @IsBoolean()
  enableWebhook?: boolean;

  @ApiPropertyOptional({ description: '是否启用模拟交易' })
  @IsOptional()
  @IsBoolean()
  enableSimulation?: boolean;

  @ApiPropertyOptional({ description: '是否启用实盘交易' })
  @IsOptional()
  @IsBoolean()
  enableLiveTrading?: boolean;
}
