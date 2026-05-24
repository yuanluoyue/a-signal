import {
  Controller,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TradingMemoryLogService } from '../../../modules/trading-memory/trading-memory-log.service.js';
import { QueryMemoryLogsDto, QueryMemoryLogsByMemoryDto } from './dto/query-memory-logs.dto.js';

@ApiTags('交易经验日志')
@Controller('trading-memory-logs')
export class TradingMemoryLogController {
  constructor(private readonly logService: TradingMemoryLogService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有交易经验修改日志' })
  async findAll(@Query() dto: QueryMemoryLogsDto) {
    return this.logService.findAll({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
      action: dto.action,
    });
  }

  @Get(':memoryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取指定交易经验的修改日志' })
  async findByMemoryId(
    @Param('memoryId') memoryId: string,
    @Query() dto: QueryMemoryLogsByMemoryDto,
  ) {
    return this.logService.findByMemoryId(memoryId, {
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });
  }
}
