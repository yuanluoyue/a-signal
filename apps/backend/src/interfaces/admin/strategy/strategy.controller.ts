import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { StrategyService } from '../../../modules/strategy/strategy.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import {
  StrategyListQueryDto,
  CreateStrategyDto,
  UpdateStrategyDto,
  UpdateStrategyRuntimeDto,
} from './dto/index.js';

@ApiTags('策略管理')
@Controller('strategies')
@ApiBearerAuth()
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取策略列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取策略列表' })
  async getStrategiesList(@Query() query: StrategyListQueryDto) {
    return await this.strategyService.findList(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取策略详情' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取策略详情' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async getStrategyById(@Param('id') id: string) {
    const strategy = await this.strategyService.findById(id);
    if (!strategy) {
      throw new NotFoundException('策略不存在');
    }
    return { data: strategy };
  }

  @Get(':id/runtime')
  @Public()
  @ApiOperation({ summary: '获取策略运行时配置' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取策略运行时配置' })
  async getStrategyRuntime(@Param('id') id: string) {
    const runtime = await this.strategyService.getOrCreateRuntime(id);
    return { data: runtime };
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建策略' })
  @ApiResponse({ status: 201, description: '成功创建策略' })
  async createStrategy(@Body() dto: CreateStrategyDto) {
    const data = await this.strategyService.create(dto);
    return { data };
  }

  @Put(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新策略' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功更新策略' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async updateStrategy(@Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    const data = await this.strategyService.update(id, dto);
    return { data };
  }

  @Put(':id/runtime')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新策略运行时配置' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功更新策略运行时配置' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async updateStrategyRuntime(@Param('id') id: string, @Body() dto: UpdateStrategyRuntimeDto) {
    const data = await this.strategyService.updateRuntime(id, dto);
    return { data };
  }
}
