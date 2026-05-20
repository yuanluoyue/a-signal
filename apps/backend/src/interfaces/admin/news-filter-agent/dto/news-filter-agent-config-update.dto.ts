import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NewsFilterAgentConfigUpdateDto {
  @ApiPropertyOptional({ description: '是否启用过滤 Agent' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '过滤 Prompt 模板，必须包含 {newsTitle} 占位符' })
  @IsOptional()
  @IsString()
  prompt?: string;
}
