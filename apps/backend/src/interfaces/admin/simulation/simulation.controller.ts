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
import { SimulationService } from '../../../modules/simulation/simulation.service.js';
import { CreateAccountDto, UpdateAccountDto, ExecuteTradeDto, AddPositionDto } from './dto/index.js';
import { Public } from '../../../common/decorators/public.decorator.js';

@ApiTags('Simulation')
@Controller('simulation')
@ApiBearerAuth()
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('account')
  @ApiOperation({ summary: '获取模拟账户信息（不存在则自动创建）' })
  @ApiResponse({ status: 200, description: '成功获取账户信息' })
  async getAccount(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    let account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      account = await this.simulationService.createAccount({
        userId,
        initialCapital: 100000,
      });
    }

    return { data: account };
  }

  @Post('account')
  @ApiOperation({ summary: '创建模拟账户' })
  @ApiResponse({ status: 201, description: '成功创建账户' })
  async createAccount(
    @Request() req: { user?: { userId: string; sub?: string } },
    @Body() dto: CreateAccountDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const existing = await this.simulationService.getAccountByUserId(userId);
    if (existing) {
      throw new BadRequestException('账户已存在');
    }

    const account = await this.simulationService.createAccount({
      userId,
      initialCapital: dto.initialCapital || 100000,
    });

    return { data: account, message: '账户创建成功' };
  }

  @Put('account')
  @ApiOperation({ summary: '更新账户资金' })
  @ApiResponse({ status: 200, description: '成功更新账户' })
  async updateAccount(
    @Request() req: { user?: { userId: string; sub?: string } },
    @Body() dto: UpdateAccountDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const updated = await this.simulationService.updateAccount(account.id, dto);
    return { data: updated, message: '账户更新成功' };
  }

  @Get('refresh')
  @ApiOperation({ summary: '刷新持仓实时价格和盈亏' })
  async refresh(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    await this.simulationService.refreshPositionPrices(account.id);
    await this.simulationService.checkTakeProfitStopLoss(account.id);

    const updatedAccount = await this.simulationService.getAccountById(account.id);
    const positions = await this.simulationService.getPositions(account.id);

    return { data: { account: updatedAccount, positions } };
  }

  @Get('equity-curve')
  @ApiOperation({ summary: '获取资金曲线' })
  async getEquityCurve(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);
    if (!account) {
      return { data: [] };
    }

    const equityCurve = await this.simulationService.getEquityCurve(account.id);
    return { data: equityCurve };
  }

  @Get('positions')
  @ApiOperation({ summary: '获取持仓列表' })
  @ApiResponse({ status: 200, description: '成功获取持仓列表' })
  async getPositions(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      return { data: [] };
    }

    const positions = await this.simulationService.getPositions(account.id);
    return { data: positions };
  }

  @Post('trade')
  @ApiOperation({ summary: '执行模拟交易' })
  @ApiResponse({ status: 201, description: '交易成功' })
  async executeTrade(
    @Request() req: { user?: { userId: string; sub?: string } },
    @Body() dto: ExecuteTradeDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const trade = await this.simulationService.executeTrade({
      accountId: account.id,
      ...dto,
    });

    return { data: trade, message: '交易成功' };
  }

  @Get('trades')
  @ApiOperation({ summary: '获取交易记录' })
  @ApiResponse({ status: 200, description: '成功获取交易记录' })
  async getTrades(@Request() req: { user?: { userId: string; sub?: string } }) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      return { data: [] };
    }

    const trades = await this.simulationService.getTrades(account.id);
    return { data: trades };
  }

  @Post('position')
  @ApiOperation({ summary: '添加持仓' })
  @ApiResponse({ status: 201, description: '成功添加持仓' })
  async addPosition(
    @Request() req: { user?: { userId: string; sub?: string } },
    @Body() dto: AddPositionDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const position = await this.simulationService.addPosition({
      accountId: account.id,
      ...dto,
    });

    return { data: position, message: '持仓添加成功' };
  }

  @Delete('position/:id')
  @ApiOperation({ summary: '删除持仓' })
  @ApiResponse({ status: 200, description: '成功删除持仓' })
  async deletePosition(
    @Request() req: { user?: { userId: string; sub?: string } },
    @Param('id') positionId: string,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }

    const account = await this.simulationService.getAccountByUserId(userId);

    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    await this.simulationService.deletePosition(positionId, account.id);
    return { message: '持仓删除成功' };
  }
}
