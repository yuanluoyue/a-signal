import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TradingMemoryService } from '../../../modules/trading-memory/trading-memory.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { TradingMemoryListQueryDto } from './dto/index.js';

@ApiTags('交易经验')
@Controller('trading-memory')
@ApiBearerAuth()
export class TradingMemoryController {
  constructor(private readonly tradingMemoryService: TradingMemoryService) {}

  @Get('stats')
  @Public()
  @ApiOperation({ summary: '获取交易经验统计' })
  @ApiResponse({ status: 200, description: '成功获取经验统计' })
  async getStats() {
    return this.tradingMemoryService.getStats();
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '获取交易经验列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取经验列表' })
  async findList(@Query() query: TradingMemoryListQueryDto) {
    return this.tradingMemoryService.findList(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取交易经验详情' })
  @ApiParam({ name: 'id', description: '经验 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取经验详情' })
  @ApiResponse({ status: 404, description: '经验不存在' })
  async getById(@Param('id') id: string) {
    const memory = await this.tradingMemoryService.findById(id);
    if (!memory) {
      throw new NotFoundException('交易经验不存在');
    }
    return { data: memory };
  }

  @Patch(':id/invalidate')
  @Public()
  @ApiOperation({ summary: '将交易经验设为失效' })
  @ApiParam({ name: 'id', description: '经验 ID', type: String })
  @ApiResponse({ status: 200, description: '成功设为失效' })
  @ApiResponse({ status: 404, description: '经验不存在' })
  async invalidate(@Param('id') id: string) {
    const memory = await this.tradingMemoryService.invalidate(id);
    return { data: memory };
  }
}
