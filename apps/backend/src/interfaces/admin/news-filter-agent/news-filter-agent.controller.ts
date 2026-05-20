import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NewsFilterAgentService } from '../../../modules/news-filter-agent/news-filter-agent.service.js';
import { NewsFilterAgentConfigUpdateDto, NewsFilterAgentLogQueryDto } from './dto/index.js';

@ApiTags('新闻过滤Agent')
@Controller('news-filter-agent')
@ApiBearerAuth()
export class NewsFilterAgentController {
  constructor(private readonly newsFilterAgentService: NewsFilterAgentService) {}

  @Get('config')
  @ApiOperation({ summary: '获取过滤 Agent 配置' })
  @ApiResponse({ status: 200, description: '成功获取配置' })
  async getConfig() {
    return this.newsFilterAgentService.getConfig();
  }

  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新过滤 Agent 配置' })
  @ApiResponse({ status: 200, description: '成功更新配置' })
  async updateConfig(@Body() dto: NewsFilterAgentConfigUpdateDto) {
    return this.newsFilterAgentService.updateConfig(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: '获取过滤日志（分页+筛选）' })
  @ApiResponse({ status: 200, description: '成功获取日志' })
  async getLogs(@Query() query: NewsFilterAgentLogQueryDto) {
    return this.newsFilterAgentService.getLogs(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取今日过滤统计' })
  @ApiResponse({ status: 200, description: '成功获取统计' })
  async getStats() {
    return this.newsFilterAgentService.getStats();
  }
}
