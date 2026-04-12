import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import {
  users,
  simulationAccounts,
  simulationPositions,
  simulationTrades,
  type NewSimulationAccount,
  type NewSimulationPosition,
  type NewSimulationTrade,
  type SimulationAccount,
  type SimulationPosition,
  type SimulationTrade,
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
  price: number;
}

export interface AddPositionDto {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(private readonly dbService: DbService) {}

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

  async executeTrade(dto: TradeDto): Promise<SimulationTrade> {
    const account = await this.getAccountById(dto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const totalAmount = dto.price * dto.quantity;
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
            updatedAt: new Date(),
          })
          .where(eq(simulationPositions.id, existingPosition.id));
      } else {
        const newPosition: NewSimulationPosition = {
          accountId: dto.accountId,
          stockCode: dto.stockCode,
          stockName: dto.stockName,
          quantity: dto.quantity,
          avgCost: dto.price.toString(),
          currentPrice: dto.price.toString(),
          marketValue: totalAmount.toString(),
          profit: '0',
          return: '0',
        };
        await this.dbService.db.insert(simulationPositions).values(newPosition);
      }
    } else {
      const existingPosition = await this.getPositionByStock(dto.accountId, dto.stockCode);
      if (!existingPosition || existingPosition.quantity < dto.quantity) {
        throw new Error('Insufficient position');
      }

      const avgCost = parseFloat(existingPosition.avgCost);
      const profit = (dto.price - avgCost) * dto.quantity;

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
        price: dto.price.toString(),
        totalAmount: totalAmount.toString(),
        profit: profit.toString(),
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

      this.logger.log(`Executed sell trade for ${dto.stockCode}, profit: ${profit}`);
      return result;
    }

    const trade: NewSimulationTrade = {
      accountId: dto.accountId,
      stockCode: dto.stockCode,
      stockName: dto.stockName,
      type: dto.type,
      quantity: dto.quantity,
      price: dto.price.toString(),
      totalAmount: totalAmount.toString(),
      tradeTime: new Date(),
    };

    const [result] = await this.dbService.db
      .insert(simulationTrades)
      .values(trade)
      .returning();

    this.logger.log(`Executed buy trade for ${dto.stockCode}`);
    return result;
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
