import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SimulationService } from './simulation.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Simulation')
@Controller('simulation')
@ApiBearerAuth()
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('account')
  @Public()
  @ApiOperation({ summary: '获取模拟账户信息（不存在则自动创建）' })
  @ApiResponse({ status: 200, description: '成功获取账户信息' })
  async getAccount(@Request() req: { user?: { userId: string } }) {
    // 暂时使用固定用户ID，实际应该从token中获取
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    let account = await this.simulationService.getAccountByUserId(userId);
    
    // 没有账户时自动创建
    if (!account) {
      account = await this.simulationService.createAccount({
        userId,
        initialCapital: 100000,
      });
    }
    
    return { data: account };
  }

  @Post('account')
  @Public()
  @ApiOperation({ summary: '创建模拟账户' })
  @ApiResponse({ status: 201, description: '成功创建账户' })
  async createAccount(
    @Request() req: { user?: { userId: string } },
    @Body() body: { initialCapital: number },
  ) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    
    // 检查是否已存在账户
    const existing = await this.simulationService.getAccountByUserId(userId);
    if (existing) {
      throw new BadRequestException('账户已存在');
    }

    const account = await this.simulationService.createAccount({
      userId,
      initialCapital: body.initialCapital || 100000,
    });

    return { data: account, message: '账户创建成功' };
  }

  @Put('account')
  @Public()
  @ApiOperation({ summary: '更新账户资金' })
  @ApiResponse({ status: 200, description: '成功更新账户' })
  async updateAccount(
    @Request() req: { user?: { userId: string } },
    @Body() body: { currentCapital?: number; availableCash?: number },
  ) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const updated = await this.simulationService.updateAccount(account.id, body);
    return { data: updated, message: '账户更新成功' };
  }

  @Get('positions')
  @Public()
  @ApiOperation({ summary: '获取持仓列表' })
  @ApiResponse({ status: 200, description: '成功获取持仓列表' })
  async getPositions(@Request() req: { user?: { userId: string } }) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    // 没有账户时返回空数组
    if (!account) {
      return { data: [] };
    }

    const positions = await this.simulationService.getPositions(account.id);
    return { data: positions };
  }

  @Post('trade')
  @Public()
  @ApiOperation({ summary: '执行模拟交易' })
  @ApiResponse({ status: 201, description: '交易成功' })
  async executeTrade(
    @Request() req: { user?: { userId: string } },
    @Body() body: {
      stockCode: string;
      stockName: string;
      type: 'buy' | 'sell';
      quantity: number;
      price: number;
    },
  ) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const trade = await this.simulationService.executeTrade({
      accountId: account.id,
      ...body,
    });

    return { data: trade, message: '交易成功' };
  }

  @Get('trades')
  @Public()
  @ApiOperation({ summary: '获取交易记录' })
  @ApiResponse({ status: 200, description: '成功获取交易记录' })
  async getTrades(@Request() req: { user?: { userId: string } }) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    // 没有账户时返回空数组
    if (!account) {
      return { data: [] };
    }

    const trades = await this.simulationService.getTrades(account.id);
    return { data: trades };
  }

  @Post('position')
  @Public()
  @ApiOperation({ summary: '添加持仓' })
  @ApiResponse({ status: 201, description: '成功添加持仓' })
  async addPosition(
    @Request() req: { user?: { userId: string } },
    @Body() body: {
      stockCode: string;
      stockName: string;
      quantity: number;
      avgCost: number;
    },
  ) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const position = await this.simulationService.addPosition({
      accountId: account.id,
      ...body,
    });

    return { data: position, message: '持仓添加成功' };
  }

  @Delete('position/:id')
  @Public()
  @ApiOperation({ summary: '删除持仓' })
  @ApiResponse({ status: 200, description: '成功删除持仓' })
  async deletePosition(
    @Request() req: { user?: { userId: string } },
    @Param('id') positionId: string,
  ) {
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
    const account = await this.simulationService.getAccountByUserId(userId);
    
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    await this.simulationService.deletePosition(positionId, account.id);
    return { message: '持仓删除成功' };
  }
}
