import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class ChatCompletionRequestDto {
  @ApiProperty({ description: '业务模块标识', example: 'agent-research' })
  @IsString()
  module: string;

  @ApiProperty({ description: '任务标识', example: 'intent' })
  @IsString()
  task: string;

  @ApiProperty({ description: '消息列表' })
  @IsArray()
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

  @ApiPropertyOptional({ description: '指定 Provider' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: '指定模型' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: '温度参数', minimum: 0, maximum: 2 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ description: '最大 Token 数' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ description: '用户 ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '追踪 ID' })
  @IsString()
  @IsOptional()
  traceId?: string;

  @ApiPropertyOptional({ description: '是否启用缓存', default: true })
  @IsBoolean()
  @IsOptional()
  enableCache?: boolean;

  @ApiPropertyOptional({ description: '是否启用降级', default: true })
  @IsBoolean()
  @IsOptional()
  enableFallback?: boolean;
}
