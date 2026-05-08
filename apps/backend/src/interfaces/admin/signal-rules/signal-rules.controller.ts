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
import { SignalRuleService } from '../../../modules/signal-rule/signal-rule.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import {
  SignalRulesListQueryDto,
  CreateSignalRuleDto,
  UpdateSignalRuleDto,
  UpdateGlobalRuleDto,
} from './dto/index.js';

@ApiTags('信号规则')
@Controller('signal-rules')
@ApiBearerAuth()
export class SignalRulesController {
  constructor(private readonly signalRuleService: SignalRuleService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取信号规则列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取信号规则列表' })
  async getRulesList(@Query() query: SignalRulesListQueryDto) {
    return await this.signalRuleService.findList(query);
  }

  @Get('global')
  @Public()
  @ApiOperation({ summary: '获取全局规则' })
  @ApiResponse({ status: 200, description: '成功获取全局规则' })
  @ApiResponse({ status: 404, description: '全局规则不存在' })
  async getGlobalRule() {
    const data = await this.signalRuleService.getGlobalRule();
    return { data };
  }

  @Put('global')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新全局规则' })
  @ApiResponse({ status: 200, description: '成功更新全局规则' })
  @ApiResponse({ status: 404, description: '全局规则不存在' })
  async updateGlobalRule(@Body() dto: UpdateGlobalRuleDto) {
    const data = await this.signalRuleService.updateGlobalRule(dto);
    return { data };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取信号规则详情' })
  @ApiParam({ name: 'id', description: '规则 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取信号规则详情' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async getRuleById(@Param('id') id: string) {
    const rule = await this.signalRuleService.findById(id);
    if (!rule) {
      throw new NotFoundException('规则不存在');
    }
    return { data: rule };
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建信号规则' })
  @ApiResponse({ status: 201, description: '成功创建信号规则' })
  async createRule(@Body() dto: CreateSignalRuleDto) {
    const data = await this.signalRuleService.create(dto);
    return { data };
  }

  @Put(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新信号规则' })
  @ApiParam({ name: 'id', description: '规则 ID', type: String })
  @ApiResponse({ status: 200, description: '成功更新信号规则' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateSignalRuleDto) {
    const data = await this.signalRuleService.update(id, dto);
    return { data };
  }
}
