import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TradingAgentService } from '../../../modules/trading-agent/trading-agent.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { TradingAgentDecisionsQueryDto, TradingAgentRuntimeUpdateDto } from './dto/index.js';

@ApiTags('交易Agent')
@Controller('trading-agent')
@ApiBearerAuth()
export class TradingAgentController {
  constructor(private readonly tradingAgentService: TradingAgentService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取今日交易Agent统计' })
  @ApiResponse({ status: 200, description: '成功获取统计数据' })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.tradingAgentService.getStats(userId);
  }

  @Get('decisions')
  @ApiOperation({ summary: '获取交易决策列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取决策列表' })
  async getDecisions(
    @CurrentUser('sub') userId: string,
    @Query() query: TradingAgentDecisionsQueryDto,
  ) {
    return this.tradingAgentService.getDecisions(userId, query);
  }

  @Get('decisions/:id')
  @ApiOperation({ summary: '根据 ID 获取交易决策详情' })
  @ApiParam({ name: 'id', description: '决策 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取决策详情' })
  @ApiResponse({ status: 404, description: '决策不存在' })
  async getDecisionById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const decision = await this.tradingAgentService.getDecisionById(id, userId);
    if (!decision) {
      throw new NotFoundException('交易决策不存在');
    }
    return decision;
  }

  @Get('runtime')
  @ApiOperation({ summary: '获取交易Agent运行时配置' })
  @ApiResponse({ status: 200, description: '成功获取运行时配置' })
  async getRuntime(@CurrentUser('sub') userId: string) {
    return this.tradingAgentService.getRuntime(userId);
  }

  @Put('runtime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新交易Agent运行时配置' })
  @ApiResponse({ status: 200, description: '成功更新运行时配置' })
  async updateRuntime(
    @CurrentUser('sub') userId: string,
    @Body() dto: TradingAgentRuntimeUpdateDto,
  ) {
    return this.tradingAgentService.updateRuntime(userId, dto);
  }
}
