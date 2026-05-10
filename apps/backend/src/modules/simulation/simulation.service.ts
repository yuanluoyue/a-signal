import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { KlinesService } from '../../modules/klines/klines.service.js';
import {
  users,
  klines,
  simulationAccounts,
  simulationPositions,
  simulationTrades,
  simulationEquityCurve,
  type NewSimulationAccount,
  type NewSimulationPosition,
  type NewSimulationTrade,
  type SimulationAccount,
  type SimulationPosition,
  type SimulationTrade,
  type SimulationEquityCurve,
} from '../../core/db/schema.js';

export interface CreateAccountDto {
  userId: string;
  initialCapital: number;
}

export interface UpdateAccountDto {
  currentCapital?: number;
  availableCash?: number;
}

export interface TradeDto {
  accountId: string;
  stockCode: string;
  stockName: string;
  type: 'buy' | 'sell';
  quantity: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface AddPositionDto {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly klinesService: KlinesService,
  ) {}

  async createAccount(dto: CreateAccountDto): Promise<SimulationAccount> {
    await this.ensureUserExists(dto.userId);

    const newAccount: NewSimulationAccount = {
      userId: dto.userId,
      initialCapital: dto.initialCapital.toString(),
      currentCapital: dto.initialCapital.toString(),
      availableCash: dto.initialCapital.toString(),
      totalProfit: '0',
      totalReturn: '0',
    };

    const [account] = await this.dbService.db
      .insert(simulationAccounts)
      .values(newAccount)
      .returning();

    this.logger.log(`Created simulation account ${account.id} for user ${dto.userId}`);
    return account;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const [existingUser] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser) {
      return;
    }

    this.logger.log(`Creating default user with id: ${userId}`);
    await this.dbService.db.insert(users).values({
      id: userId,
      nickname: '模拟用户',
      email: 'simulation@example.com',
      password: 'not-used',
    });
    this.logger.log(`Default user created`);
  }

  async getAccountByUserId(userId: string): Promise<SimulationAccount | null> {
    const [account] = await this.dbService.db
      .select()
      .from(simulationAccounts)
      .where(eq(simulationAccounts.userId, userId))
      .limit(1);

    return account || null;
  }

  async getAccountById(id: string): Promise<SimulationAccount | null> {
    const [account] = await this.dbService.db
      .select()
      .from(simulationAccounts)
      .where(eq(simulationAccounts.id, id))
      .limit(1);

    return account || null;
  }

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<SimulationAccount> {
    const account = await this.getAccountById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const [updated] = await this.dbService.db
      .update(simulationAccounts)
      .set({
        currentCapital: dto.currentCapital?.toString(),
        availableCash: dto.availableCash?.toString(),
      })
      .where(eq(simulationAccounts.id, id))
      .returning();

    return updated;
  }

  async getPositions(accountId: string): Promise<SimulationPosition[]> {
    return this.dbService.db
      .select()
      .from(simulationPositions)
      .where(eq(simulationPositions.accountId, accountId))
      .orderBy(desc(simulationPositions.updatedAt));
  }

  async getPositionByStock(accountId: string, stockCode: string): Promise<SimulationPosition | null> {
    const [position] = await this.dbService.db
      .select()
      .from(simulationPositions)
      .where(
        and(
          eq(simulationPositions.accountId, accountId),
          eq(simulationPositions.stockCode, stockCode),
        ),
      )
      .limit(1);

    return position || null;
  }

  async getLatestPrice(stockCode: string): Promise<number> {
    await this.klinesService.checkAndUpdateKlines(stockCode, '4h');

    const result = await this.dbService.db
      .select({ close: klines.close })
      .from(klines)
      .where(and(eq(klines.stockCode, stockCode.trim().toLowerCase()), eq(klines.period, '4h')))
      .orderBy(desc(klines.timestamp))
      .limit(1);

    if (!result[0]) {
      throw new Error(`无法获取 ${stockCode} 的最新价格`);
    }

    return parseFloat(result[0].close);
  }

  async refreshPositionPrices(accountId: string): Promise<void> {
    const positions = await this.getPositions(accountId);

    for (const position of positions) {
      const latestPrice = await this.getLatestPrice(position.stockCode);
      const avgCost = parseFloat(position.avgCost);
      const marketValue = position.quantity * latestPrice;
      const profit = (latestPrice - avgCost) * position.quantity;
      const returnVal = profit / (position.quantity * avgCost);

      await this.dbService.db
        .update(simulationPositions)
        .set({
          currentPrice: latestPrice.toString(),
          marketValue: marketValue.toString(),
          profit: profit.toString(),
          return: returnVal.toString(),
          updatedAt: new Date(),
        })
        .where(eq(simulationPositions.id, position.id));
    }

    await this.refreshAccountEquity(accountId);
  }

  async refreshAccountEquity(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const positions = await this.getPositions(accountId);
    const totalPositionValue = positions.reduce((sum, p) => {
      const mv = p.marketValue ? parseFloat(p.marketValue) : parseFloat(p.currentPrice || p.avgCost) * p.quantity;
      return sum + mv;
    }, 0);

    const availableCash = parseFloat(account.availableCash);
    const initialCapital = parseFloat(account.initialCapital);
    const totalProfit = totalPositionValue + availableCash - initialCapital;
    const totalReturn = totalProfit / initialCapital;

    await this.dbService.db
      .update(simulationAccounts)
      .set({
        currentCapital: (availableCash + totalPositionValue).toString(),
        totalProfit: totalProfit.toString(),
        totalReturn: totalReturn.toString(),
      })
      .where(eq(simulationAccounts.id, accountId));
  }

  async recordEquityCurve(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const positions = await this.getPositions(accountId);
    const positionValue = positions.reduce((sum, p) => {
      const mv = p.marketValue ? parseFloat(p.marketValue) : parseFloat(p.currentPrice || p.avgCost) * p.quantity;
      return sum + mv;
    }, 0);

    const availableCash = parseFloat(account.availableCash);
    const totalEquity = availableCash + positionValue;
    const initialCapital = parseFloat(account.initialCapital);
    const totalProfit = totalEquity - initialCapital;
    const totalReturn = totalProfit / initialCapital;

    await this.dbService.db.insert(simulationEquityCurve).values({
      accountId,
      totalEquity: totalEquity.toString(),
      availableCash: availableCash.toString(),
      positionValue: positionValue.toString(),
      totalProfit: totalProfit.toString(),
      totalReturn: totalReturn.toString(),
      recordedAt: new Date(),
    });
  }

  async getEquityCurve(accountId: string): Promise<SimulationEquityCurve[]> {
    return this.dbService.db
      .select()
      .from(simulationEquityCurve)
      .where(eq(simulationEquityCurve.accountId, accountId))
      .orderBy(simulationEquityCurve.recordedAt);
  }

  async checkTakeProfitStopLoss(accountId: string): Promise<void> {
    const positions = await this.getPositions(accountId);
    const positionsWithTpSl = positions.filter(
      (p) => (p.takeProfitPrice !== null && p.takeProfitPrice !== undefined) || (p.stopLossPrice !== null && p.stopLossPrice !== undefined),
    );

    for (const position of positionsWithTpSl) {
      if (!position.currentPrice) continue;

      const currentPrice = parseFloat(position.currentPrice);
      const takeProfitPrice = position.takeProfitPrice ? parseFloat(position.takeProfitPrice) : null;
      const stopLossPrice = position.stopLossPrice ? parseFloat(position.stopLossPrice) : null;

      if (takeProfitPrice !== null && currentPrice >= takeProfitPrice) {
        await this.autoClosePosition(accountId, position, currentPrice, 'take_profit', 'system');
      } else if (stopLossPrice !== null && currentPrice <= stopLossPrice) {
        await this.autoClosePosition(accountId, position, currentPrice, 'stop_loss', 'system');
      }
    }
  }

  private async autoClosePosition(
    accountId: string,
    position: SimulationPosition,
    price: number,
    closeReason: string,
    tradeSource: string,
  ): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const totalAmount = price * position.quantity;
    const availableCash = parseFloat(account.availableCash);
    const avgCost = parseFloat(position.avgCost);
    const profit = (price - avgCost) * position.quantity;

    await this.dbService.db
      .update(simulationAccounts)
      .set({
        availableCash: (availableCash + totalAmount).toString(),
      })
      .where(eq(simulationAccounts.id, accountId));

    await this.dbService.db
      .delete(simulationPositions)
      .where(eq(simulationPositions.id, position.id));

    const trade: NewSimulationTrade = {
      accountId,
      stockCode: position.stockCode,
      stockName: position.stockName,
      type: 'sell',
      quantity: position.quantity,
      price: price.toString(),
      totalAmount: totalAmount.toString(),
      profit: profit.toString(),
      closeReason,
      tradeSource,
      tradeTime: new Date(),
    };

    await this.dbService.db.insert(simulationTrades).values(trade);

    const totalProfit = parseFloat(account.totalProfit) + profit;
    const totalReturn = (totalProfit / parseFloat(account.initialCapital)) * 100;
    await this.dbService.db
      .update(simulationAccounts)
      .set({
        totalProfit: totalProfit.toString(),
        totalReturn: totalReturn.toString(),
      })
      .where(eq(simulationAccounts.id, accountId));

    this.logger.log(`Auto closed position for ${position.stockCode}, reason: ${closeReason}, profit: ${profit}`);
  }

  async executeTrade(dto: TradeDto): Promise<SimulationTrade> {
    const account = await this.getAccountById(dto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const price = await this.getLatestPrice(dto.stockCode);
    const totalAmount = price * dto.quantity;
    const availableCash = parseFloat(account.availableCash);

    if (dto.type === 'buy') {
      if (availableCash < totalAmount) {
        throw new Error('Insufficient funds');
      }

      await this.dbService.db
        .update(simulationAccounts)
        .set({
          availableCash: (availableCash - totalAmount).toString(),
        })
        .where(eq(simulationAccounts.id, dto.accountId));

      const existingPosition = await this.getPositionByStock(dto.accountId, dto.stockCode);
      if (existingPosition) {
        const oldQuantity = existingPosition.quantity;
        const oldAvgCost = parseFloat(existingPosition.avgCost);
        const newQuantity = oldQuantity + dto.quantity;
        const newAvgCost = (oldQuantity * oldAvgCost + totalAmount) / newQuantity;

        await this.dbService.db
          .update(simulationPositions)
          .set({
            quantity: newQuantity,
            avgCost: newAvgCost.toString(),
            currentPrice: price.toString(),
            marketValue: (newQuantity * price).toString(),
            profit: ((price - newAvgCost) * newQuantity).toString(),
            return: ((price - newAvgCost) / newAvgCost).toString(),
            takeProfitPrice: dto.takeProfitPrice?.toString() ?? existingPosition.takeProfitPrice,
            stopLossPrice: dto.stopLossPrice?.toString() ?? existingPosition.stopLossPrice,
            tradeSource: 'manual',
            updatedAt: new Date(),
          })
          .where(eq(simulationPositions.id, existingPosition.id));
      } else {
        const newPosition: NewSimulationPosition = {
          accountId: dto.accountId,
          stockCode: dto.stockCode,
          stockName: dto.stockName,
          quantity: dto.quantity,
          avgCost: price.toString(),
          currentPrice: price.toString(),
          marketValue: totalAmount.toString(),
          profit: '0',
          return: '0',
          takeProfitPrice: dto.takeProfitPrice?.toString(),
          stopLossPrice: dto.stopLossPrice?.toString(),
          tradeSource: 'manual',
        };
        await this.dbService.db.insert(simulationPositions).values(newPosition);
      }

      const trade: NewSimulationTrade = {
        accountId: dto.accountId,
        stockCode: dto.stockCode,
        stockName: dto.stockName,
        type: dto.type,
        quantity: dto.quantity,
        price: price.toString(),
        totalAmount: totalAmount.toString(),
        tradeSource: 'manual',
        tradeTime: new Date(),
      };

      const [result] = await this.dbService.db
        .insert(simulationTrades)
        .values(trade)
        .returning();

      await this.recordEquityCurve(dto.accountId);
      this.logger.log(`Executed buy trade for ${dto.stockCode}`);
      return result;
    } else {
      const existingPosition = await this.getPositionByStock(dto.accountId, dto.stockCode);
      if (!existingPosition || existingPosition.quantity < dto.quantity) {
        throw new Error('Insufficient position');
      }

      const avgCost = parseFloat(existingPosition.avgCost);
      const profit = (price - avgCost) * dto.quantity;

      await this.dbService.db
        .update(simulationAccounts)
        .set({
          availableCash: (availableCash + totalAmount).toString(),
        })
        .where(eq(simulationAccounts.id, dto.accountId));

      const newQuantity = existingPosition.quantity - dto.quantity;
      if (newQuantity === 0) {
        await this.dbService.db
          .delete(simulationPositions)
          .where(eq(simulationPositions.id, existingPosition.id));
      } else {
        await this.dbService.db
          .update(simulationPositions)
          .set({
            quantity: newQuantity,
            currentPrice: price.toString(),
            marketValue: (newQuantity * price).toString(),
            profit: ((price - avgCost) * newQuantity).toString(),
            return: ((price - avgCost) / avgCost).toString(),
            updatedAt: new Date(),
          })
          .where(eq(simulationPositions.id, existingPosition.id));
      }

      const trade: NewSimulationTrade = {
        accountId: dto.accountId,
        stockCode: dto.stockCode,
        stockName: dto.stockName,
        type: dto.type,
        quantity: dto.quantity,
        price: price.toString(),
        totalAmount: totalAmount.toString(),
        profit: profit.toString(),
        closeReason: 'manual',
        tradeSource: 'manual',
        tradeTime: new Date(),
      };

      const [result] = await this.dbService.db
        .insert(simulationTrades)
        .values(trade)
        .returning();

      const totalProfit = parseFloat(account.totalProfit) + profit;
      const totalReturn = (totalProfit / parseFloat(account.initialCapital)) * 100;
      await this.dbService.db
        .update(simulationAccounts)
        .set({
          totalProfit: totalProfit.toString(),
          totalReturn: totalReturn.toString(),
        })
        .where(eq(simulationAccounts.id, dto.accountId));

      await this.recordEquityCurve(dto.accountId);
      this.logger.log(`Executed sell trade for ${dto.stockCode}, profit: ${profit}`);
      return result;
    }
  }

  async getTrades(accountId: string, limit: number = 50): Promise<SimulationTrade[]> {
    return this.dbService.db
      .select()
      .from(simulationTrades)
      .where(eq(simulationTrades.accountId, accountId))
      .orderBy(desc(simulationTrades.tradeTime))
      .limit(limit);
  }

  async addPosition(dto: AddPositionDto): Promise<SimulationPosition> {
    const account = await this.getAccountById(dto.accountId);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const existingPosition = await this.getPositionByStock(dto.accountId, dto.stockCode);
    if (existingPosition) {
      const oldQuantity = existingPosition.quantity;
      const oldAvgCost = parseFloat(existingPosition.avgCost);
      const newQuantity = oldQuantity + dto.quantity;
      const totalCost = oldQuantity * oldAvgCost + dto.quantity * dto.avgCost;
      const newAvgCost = totalCost / newQuantity;
      const marketValue = newQuantity * parseFloat(existingPosition.currentPrice || existingPosition.avgCost);

      const [updated] = await this.dbService.db
        .update(simulationPositions)
        .set({
          quantity: newQuantity,
          avgCost: newAvgCost.toString(),
          marketValue: marketValue.toString(),
          takeProfitPrice: dto.takeProfitPrice?.toString() ?? existingPosition.takeProfitPrice,
          stopLossPrice: dto.stopLossPrice?.toString() ?? existingPosition.stopLossPrice,
          tradeSource: 'manual',
          updatedAt: new Date(),
        })
        .where(eq(simulationPositions.id, existingPosition.id))
        .returning();

      this.logger.log(`Updated position for ${dto.stockCode}, new quantity: ${newQuantity}`);
      return updated;
    }

    const marketValue = dto.quantity * dto.avgCost;
    const newPosition: NewSimulationPosition = {
      accountId: dto.accountId,
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      quantity: dto.quantity,
      avgCost: dto.avgCost.toString(),
      currentPrice: dto.avgCost.toString(),
      marketValue: marketValue.toString(),
      profit: '0',
      return: '0',
      takeProfitPrice: dto.takeProfitPrice?.toString(),
      stopLossPrice: dto.stopLossPrice?.toString(),
      tradeSource: 'manual',
    };

    const [position] = await this.dbService.db
      .insert(simulationPositions)
      .values(newPosition)
      .returning();

    this.logger.log(`Created position for ${dto.stockCode}, quantity: ${dto.quantity}`);
    return position;
  }

  async deletePosition(positionId: string, accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    const [position] = await this.dbService.db
      .select()
      .from(simulationPositions)
      .where(
        and(
          eq(simulationPositions.id, positionId),
          eq(simulationPositions.accountId, accountId),
        ),
      )
      .limit(1);

    if (!position) {
      throw new NotFoundException('持仓不存在');
    }

    await this.dbService.db
      .delete(simulationPositions)
      .where(eq(simulationPositions.id, positionId));

    this.logger.log(`Deleted position ${positionId} for account ${accountId}`);
  }
}
