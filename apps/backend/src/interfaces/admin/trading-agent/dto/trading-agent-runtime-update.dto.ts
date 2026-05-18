import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TradingAgentRuntimeUpdateDto {
  @ApiPropertyOptional({ description: '运行状态: running / stopped' })
  @IsOptional()
  @IsString()
  @IsIn(['running', 'stopped'])
  status?: string;

  @ApiPropertyOptional({ description: '模拟账户 ID' })
  @IsOptional()
  @IsString()
  accountId?: string;
}
