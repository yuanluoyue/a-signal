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
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { StrategyService } from '../../../modules/strategy/strategy.service.js';
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

  private extractUserId(req: { user?: { userId: string; sub?: string } }): string {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '获取策略列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取策略列表' })
  async getStrategiesList(
    @Query() query: StrategyListQueryDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    return await this.strategyService.findList(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取策略详情' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取策略详情' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async getStrategyById(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const strategy = await this.strategyService.findById(id, userId);
    if (!strategy) {
      throw new NotFoundException('策略不存在');
    }
    return { data: strategy };
  }

  @Get(':id/runtime')
  @ApiOperation({ summary: '获取策略运行时配置' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取策略运行时配置' })
  async getStrategyRuntime(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const runtime = await this.strategyService.getOrCreateRuntime(id, userId);
    return { data: runtime };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建策略' })
  @ApiResponse({ status: 201, description: '成功创建策略' })
  async createStrategy(
    @Body() dto: CreateStrategyDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.strategyService.create(dto, userId);
    return { data };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新策略' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功更新策略' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async updateStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.strategyService.update(id, dto, userId);
    return { data };
  }

  @Put(':id/runtime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新策略运行时配置' })
  @ApiParam({ name: 'id', description: '策略 ID', type: String })
  @ApiResponse({ status: 200, description: '成功更新策略运行时配置' })
  @ApiResponse({ status: 404, description: '策略不存在' })
  async updateStrategyRuntime(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyRuntimeDto,
    @Request() req: { user?: { userId: string; sub?: string } },
  ) {
    const userId = this.extractUserId(req);
    const data = await this.strategyService.updateRuntime(id, dto, userId);
    return { data };
  }
}
