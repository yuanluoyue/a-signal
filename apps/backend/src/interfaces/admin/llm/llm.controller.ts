import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LlmUsageService } from '../../../modules/llm/gateway/llm-usage.service.js';
import { LlmLogQueryDto, CreateProviderConfigDto, UpdateProviderConfigDto } from '../../../modules/llm/dto/index.js';

@ApiTags('LLM 运行中心')
@ApiBearerAuth()
@Controller('llm')
export class LlmController {
  constructor(private readonly llmUsageService: LlmUsageService) {}

  @Get('stats/today')
  @ApiOperation({ summary: '获取今日统计' })
  async getTodayStats() {
    return this.llmUsageService.getTodayStats();
  }

  @Get('stats/module-usage')
  @ApiOperation({ summary: '获取模块使用分析' })
  async getModuleUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date();
    return this.llmUsageService.getModuleUsage(start, end);
  }

  @Get('stats/provider-usage')
  @ApiOperation({ summary: '获取 Provider 使用分析' })
  async getProviderUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date();
    return this.llmUsageService.getProviderUsage(start, end);
  }

  @Get('stats/latency')
  @ApiOperation({ summary: '获取延迟分析' })
  async getLatencyStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date();
    return this.llmUsageService.getLatencyStats(start, end);
  }

  @Get('provider-configs')
  @ApiOperation({ summary: '获取所有 Provider 配置' })
  async getProviderConfigs() {
    return this.llmUsageService.getAllProviderConfigs();
  }

  @Post('provider-configs')
  @ApiOperation({ summary: '新增 Provider 配置' })
  async createProviderConfig(@Body() dto: CreateProviderConfigDto) {
    return this.llmUsageService.createProviderConfig(dto);
  }

  @Put('provider-configs/:provider')
  @ApiOperation({ summary: '更新 Provider 配置' })
  @ApiParam({ name: 'provider', description: 'Provider 名称' })
  async updateProviderConfig(
    @Param('provider') provider: string,
    @Body() dto: UpdateProviderConfigDto,
  ) {
    await this.llmUsageService.updateProviderConfig(provider, dto);
    return { success: true };
  }

  @Get('logs')
  @ApiOperation({ summary: '获取 LLM 日志列表' })
  async getLogList(@Query() query: LlmLogQueryDto) {
    return this.llmUsageService.getLogList(query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: '获取 LLM 日志详情' })
  @ApiParam({ name: 'id', description: '日志 ID' })
  async getLogDetail(@Param('id') id: string) {
    return this.llmUsageService.getLogDetail(id);
  }
}
