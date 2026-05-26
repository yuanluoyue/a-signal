import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { KlinesService } from '../../modules/klines/klines.service.js';
import { CacheService } from '../../core/cache/cache.service.js';
import { TradingMemoryService } from '../trading-memory/trading-memory.service.js';
import {
  users,
  klines,
  strategies,
  stocks,
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
  name?: string;
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
  strategyId?: string;
  tradeSource?: string;
}

export interface AddPositionDto {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  strategyId?: string;
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly klinesService: KlinesService,
    private readonly cacheService: CacheService,
    private readonly tradingMemoryService: TradingMemoryService,
  ) {}

  async createAccount(dto: CreateAccountDto): Promise<SimulationAccount> {
    await this.ensureUserExists(dto.userId);

    if (dto.name) {
      const [existing] = await this.dbService.db
        .select()
        .from(simulationAccounts)
        .where(
          and(
            eq(simulationAccounts.userId, dto.userId),
            eq(simulationAccounts.name, dto.name),
          ),
        )
        .limit(1);

      if (existing) {
        throw new ConflictException(`Account with name "${dto.name}" already exists for this user`);
      }
    }

    const newAccount: NewSimulationAccount = {
      userId: dto.userId,
      name: dto.name || null,
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

  private async verifyAccountOwnership(accountId: string, userId: string): Promise<SimulationAccount> {
    const account = await this.getAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (account.userId !== userId) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async getAccountByUserId(userId: string): Promise<SimulationAccount | null> {
    const [account] = await this.dbService.db
      .select()
      .from(simulationAccounts)
      .where(eq(simulationAccounts.userId, userId))
      .limit(1);

    return account || null;
  }

  async getAccountsByUserId(userId: string): Promise<SimulationAccount[]> {
    return this.dbService.db
      .select()
      .from(simulationAccounts)
      .where(eq(simulationAccounts.userId, userId))
      .orderBy(simulationAccounts.createdAt);
  }

  async getAllAccounts(): Promise<SimulationAccount[]> {
    return this.dbService.db
      .select()
      .from(simulationAccounts)
      .orderBy(simulationAccounts.createdAt);
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
    const positions = await this.dbService.db
      .select()
      .from(simulationPositions)
      .where(eq(simulationPositions.accountId, accountId))
      .orderBy(desc(simulationPositions.updatedAt), desc(simulationPositions.createdAt));
    
    return positions.map(p => ({
      ...p,
      tradeSource: p.tradeSource || 'manual',
    }));
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
    const cleanCode = stockCode.trim().toLowerCase();
    const cacheKey = `price:${cleanCode}:4h`;

    const cached = await this.cacheService.get<number>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    await this.klinesService.checkAndUpdateKlines(cleanCode, '4h');

    const result = await this.dbService.db
      .select({ close: klines.close })
      .from(klines)
      .where(and(eq(klines.stockCode, cleanCode), eq(klines.period, '4h')))
      .orderBy(desc(klines.timestamp))
      .limit(1);

    if (!result[0]) {
      throw new Error(`无法获取 ${stockCode} 的最新价格`);
    }

    const price = parseFloat(result[0].close);
    await this.cacheService.set(cacheKey, price, 5 * 60 * 1000);
    return price;
  }

  private async resolveStockName(stockCode: string, providedName?: string): Promise<string> {
    try {
      const [row] = await this.dbService.db
        .select({ name: stocks.name })
        .from(stocks)
        .where(eq(stocks.code, stockCode.trim().toLowerCase()))
        .limit(1);
      if (row?.name) return row.name;
    } catch (error) {
      this.logger.error(`resolveStockName: failed to lookup stock name for ${stockCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (providedName && providedName.trim()) return providedName;
    return stockCode;
  }

  async refreshPositionPrices(accountId: string): Promise<void> {
    const positions = await this.getPositions(accountId);

    const pricePromises = positions.map(async (position) => {
      try {
        const latestPrice = await this.getLatestPrice(position.stockCode);
        return { position, latestPrice };
      } catch (error) {
        this.logger.error(`refreshPositionPrices: failed to get price for ${position.stockCode}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    });

    const results = await Promise.all(pricePromises);

    for (const item of results) {
      if (!item) continue;
      const { position, latestPrice } = item;
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
    await this.recordEquityCurve(accountId);
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

    const recentRecords = await this.dbService.db
      .select()
      .from(simulationEquityCurve)
      .where(eq(simulationEquityCurve.accountId, accountId))
      .orderBy(desc(simulationEquityCurve.recordedAt))
      .limit(1);

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    if (recentRecords.length > 0 && new Date(recentRecords[0].recordedAt) >= oneMinuteAgo) {
      await this.dbService.db
        .update(simulationEquityCurve)
        .set({
          totalEquity: totalEquity.toString(),
          availableCash: availableCash.toString(),
          positionValue: positionValue.toString(),
          totalProfit: totalProfit.toString(),
          totalReturn: totalReturn.toString(),
          recordedAt: now,
        })
        .where(eq(simulationEquityCurve.id, recentRecords[0].id));
    } else {
      await this.dbService.db.insert(simulationEquityCurve).values({
        accountId,
        totalEquity: totalEquity.toString(),
        availableCash: availableCash.toString(),
        positionValue: positionValue.toString(),
        totalProfit: totalProfit.toString(),
        totalReturn: totalReturn.toString(),
        recordedAt: now,
      });
    }
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
      tradeSource: position.tradeSource || tradeSource,
      strategyId: position.strategyId || null,
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

    try {
      this.logger.log(`[autoClosePosition] Triggering memory calibration after ${closeReason} for ${position.stockCode}`);
      const calibrationResults = await this.tradingMemoryService.calibrateRelevantMemories({
        stockCode: position.stockCode,
      });
      if (calibrationResults.length > 0) {
        this.logger.log(`[autoClosePosition] Calibrated ${calibrationResults.length} memories after ${closeReason}`);
        for (const result of calibrationResults) {
          if (result.oldStatus !== result.newStatus) {
            this.logger.log(`[autoClosePosition] Memory "${result.title}" status: ${result.oldStatus} → ${result.newStatus}`);
          }
        }
      }
    } catch (calibrationError) {
      this.logger.error(`[autoClosePosition] Memory calibration failed (non-blocking): ${calibrationError instanceof Error ? calibrationError.message : String(calibrationError)}`);
    }
  }

  async executeTrade(dto: TradeDto): Promise<SimulationTrade> {
    const account = await this.getAccountById(dto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const stockName = await this.resolveStockName(dto.stockCode, dto.stockName);
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
            strategyId: dto.strategyId || existingPosition.strategyId,
            tradeSource: dto.tradeSource || 'manual',
            updatedAt: new Date(),
          })
          .where(eq(simulationPositions.id, existingPosition.id));
      } else {
        const newPosition: NewSimulationPosition = {
          accountId: dto.accountId,
          stockCode: dto.stockCode,
          stockName,
          quantity: dto.quantity,
          avgCost: price.toString(),
          currentPrice: price.toString(),
          marketValue: totalAmount.toString(),
          profit: '0',
          return: '0',
          takeProfitPrice: dto.takeProfitPrice?.toString(),
          stopLossPrice: dto.stopLossPrice?.toString(),
          strategyId: dto.strategyId || null,
          tradeSource: dto.tradeSource || 'manual',
        };
        await this.dbService.db.insert(simulationPositions).values(newPosition);
      }

      const trade: NewSimulationTrade = {
        accountId: dto.accountId,
        stockCode: dto.stockCode,
        stockName,
        type: dto.type,
        quantity: dto.quantity,
        price: price.toString(),
        totalAmount: totalAmount.toString(),
        tradeSource: dto.tradeSource || 'manual',
        strategyId: dto.strategyId || null,
        tradeTime: new Date(),
      };

      const [result] = await this.dbService.db
        .insert(simulationTrades)
        .values(trade)
        .returning();

      await this.refreshAccountEquity(dto.accountId);
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
        stockName,
        type: dto.type,
        quantity: dto.quantity,
        price: price.toString(),
        totalAmount: totalAmount.toString(),
        profit: profit.toString(),
        closeReason: dto.tradeSource === 'agent' ? 'agent' : 'manual',
        tradeSource: dto.tradeSource || 'manual',
        strategyId: dto.strategyId || null,
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

  async executeStrategyTrade(dto: {
    strategyId: string;
    accountId?: string;
    stockCode: string;
    stockName: string;
    quantity: number;
    stopLossPct?: number;
    takeProfitPct?: number;
  }): Promise<SimulationTrade | null> {
    let account: SimulationAccount | null;

    if (dto.accountId) {
      account = await this.getAccountById(dto.accountId);
      if (!account) {
        this.logger.error(`executeStrategyTrade: account ${dto.accountId} not found`);
        return null;
      }
    } else {
      this.logger.warn(`executeStrategyTrade: no accountId specified for strategy ${dto.strategyId}, falling back to first account for strategy owner`);
      const [strategyRow] = await this.dbService.db
        .select({ userId: strategies.userId })
        .from(strategies)
        .where(eq(strategies.id, dto.strategyId))
        .limit(1);

      if (!strategyRow?.userId) {
        this.logger.error(`executeStrategyTrade: strategy ${dto.strategyId} not found or has no userId`);
        return null;
      }

      const [firstAccount] = await this.dbService.db
        .select()
        .from(simulationAccounts)
        .where(eq(simulationAccounts.userId, strategyRow.userId))
        .limit(1);
      account = firstAccount || null;
    }

    if (!account) {
      this.logger.error('executeStrategyTrade: no simulation account found');
      return null;
    }

    const price = await this.getLatestPrice(dto.stockCode);
    const totalAmount = price * dto.quantity;
    const availableCash = parseFloat(account.availableCash);
    if (availableCash < totalAmount) {
      this.logger.warn(`executeStrategyTrade: insufficient funds for strategy ${dto.strategyId}, need ${totalAmount}, have ${availableCash}`);
      return null;
    }
    let takeProfitPrice: number | undefined;
    let stopLossPrice: number | undefined;
    if (dto.takeProfitPct) {
      takeProfitPrice = price * (1 + dto.takeProfitPct);
    }
    if (dto.stopLossPct) {
      stopLossPrice = price * (1 - dto.stopLossPct);
    }
    return this.executeTrade({
      accountId: account.id,
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      type: 'buy',
      quantity: dto.quantity,
      takeProfitPrice,
      stopLossPrice,
      strategyId: dto.strategyId,
      tradeSource: 'strategy',
    });
  }

  async getTrades(accountId: string, limit: number = 50): Promise<SimulationTrade[]> {
    const trades = await this.dbService.db
      .select()
      .from(simulationTrades)
      .where(eq(simulationTrades.accountId, accountId))
      .orderBy(desc(simulationTrades.tradeTime), desc(simulationTrades.createdAt))
      .limit(limit);
    
    return trades.map(t => ({
      ...t,
      tradeSource: t.tradeSource || 'manual',
    }));
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
          strategyId: dto.strategyId ?? existingPosition.strategyId,
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
      strategyId: dto.strategyId || null,
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
