import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString } from 'class-validator';
import { PeriodicReportService } from '../../../modules/periodic-report/periodic-report.service.js';

class UpdateReportConfigDto {
  @ApiPropertyOptional({ description: '日报推送 Webhook ID 列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dailyWebhookIds?: string[];

  @ApiPropertyOptional({ description: '周报推送 Webhook ID 列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weeklyWebhookIds?: string[];
}

@ApiTags('定期报告')
@Controller('periodic-reports')
@ApiBearerAuth()
export class PeriodicReportController {
  constructor(private readonly periodicReportService: PeriodicReportService) {}

  @Get()
  @ApiOperation({ summary: '获取定期报告列表' })
  @ApiQuery({ name: 'type', required: false, enum: ['daily', 'weekly'], description: '报告类型' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期' })
  @ApiResponse({ status: 200, description: '成功获取报告列表' })
  async getReports(
    @Query('type') type?: 'daily' | 'weekly',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.periodicReportService.findAll({
      type,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      startDate,
      endDate,
    });
    return {
      data: result.data,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
  }

  @Get('config')
  @ApiOperation({ summary: '获取报告推送配置' })
  async getConfig() {
    const config = await this.periodicReportService.getConfig();
    return { data: config };
  }

  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新报告推送配置' })
  async updateConfig(@Body() dto: UpdateReportConfigDto) {
    const config = await this.periodicReportService.updateConfig(dto);
    return { data: config, message: '配置更新成功' };
  }

  @Post('config/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试报告推送' })
  async testPush() {
    await this.periodicReportService.testPush();
    return { message: '测试推送已发送' };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取报告详情' })
  @ApiParam({ name: 'id', description: '报告 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取报告详情' })
  @ApiResponse({ status: 404, description: '报告不存在' })
  async getReport(@Param('id') id: string) {
    const report = await this.periodicReportService.findById(id);
    if (!report) {
      throw new NotFoundException('报告不存在');
    }
    return { data: report };
  }

  @Post('generate/daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动生成日报' })
  @ApiResponse({ status: 200, description: '日报生成成功' })
  async generateDailyReport() {
    const report = await this.periodicReportService.generateDailyReport();
    return {
      data: report,
      message: '日报生成成功',
    };
  }

  @Post('generate/weekly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动生成周报' })
  @ApiResponse({ status: 200, description: '周报生成成功' })
  async generateWeeklyReport() {
    const report = await this.periodicReportService.generateWeeklyReport();
    return {
      data: report,
      message: '周报生成成功',
    };
  }
}
