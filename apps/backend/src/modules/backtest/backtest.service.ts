import { Injectable, Logger } from '@nestjs/common';
import { and, gte, lte, inArray, desc, eq } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { KlinesService, KlinePeriod } from '../klines/klines.service.js';
import { signals, klines, backtestRecords, Signal, Kline, type NewBacktestRecord, type BacktestRecord } from '../../core/db/schema.js';
import { BacktestRequestDto, BacktestResponse, TradeResult, BacktestPeriod } from '../../interfaces/admin/backtest/dto/backtest.dto.js';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly klinesService: KlinesService,
  ) {}

  async runBacktest(dto: BacktestRequestDto): Promise<BacktestResponse> {
    const period = dto.period || BacktestPeriod.FOUR_HOURS;
    const klinePeriod: KlinePeriod = period === BacktestPeriod.ONE_DAY ? '1d' : '4h';

    this.logger.log(
      `Running backtest from ${dto.startTime.toISOString()} to ${dto.endTime.toISOString()} with period ${period}`,
    );

    const signalsList = await this.querySignals(dto);
    this.logger.log(`Found ${signalsList.length} signals matching criteria`);

    if (signalsList.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        avgReturn: 0,
        trades: [],
      };
    }

    const trades: TradeResult[] = [];

    for (const signal of signalsList) {
      try {
        const trade = await this.simulateTrade(signal, dto, klinePeriod);
        if (trade) {
          trades.push(trade);
        }
      } catch (error) {
        this.logger.error(
          `Failed to simulate trade for signal ${signal.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const result = this.calculateStatistics(trades);

    await this.saveBacktestRecord(dto, result, period);

    return result;
  }

  private async querySignals(dto: BacktestRequestDto): Promise<Signal[]> {
    const conditions = [
      gte(signals.signalTime, dto.startTime),
      lte(signals.signalTime, dto.endTime),
      gte(signals.confidence, dto.minConfidence),
      lte(signals.confidence, dto.maxConfidence),
      inArray(signals.direction, dto.directions),
    ];

    if (dto.stockCode) {
      conditions.push(eq(signals.stockCode, dto.stockCode));
    }

    const results = await this.dbService.db
      .select()
      .from(signals)
      .where(and(...conditions))
      .orderBy(signals.signalTime);

    return results;
  }

  private async simulateTrade(
    signal: Signal,
    dto: BacktestRequestDto,
    period: KlinePeriod,
  ): Promise<TradeResult | null> {
    const signalTime = new Date(signal.signalTime ?? new Date());

    const klineData = await this.klinesService.getKlines(
      signal.stockCode ?? '',
      period,
      signalTime,
      dto.endTime,
    );

    if (klineData.length === 0) {
      this.logger.warn(`No kline data found for ${signal.stockCode} after ${signalTime.toISOString()}`);
      return null;
    }

    const entryKline = klineData[0];
    const entryPrice = parseFloat(entryKline.close);

    if (isNaN(entryPrice) || entryPrice <= 0) {
      this.logger.warn(`Invalid entry price for signal ${signal.id}: ${entryKline.close}`);
      return null;
    }

    const isBuy = signal.direction === 'buy';
    const stopLossPrice = isBuy
      ? entryPrice * (1 - dto.stopLoss)
      : entryPrice * (1 + dto.stopLoss);
    const takeProfitPrice = isBuy
      ? entryPrice * (1 + dto.takeProfit)
      : entryPrice * (1 - dto.takeProfit);

    let exitPrice = entryPrice;
    let exitReason: 'takeProfit' | 'stopLoss' | 'timeExpired' = 'timeExpired';
    let exitTime = signalTime;

    for (let i = 1; i < klineData.length; i++) {
      const kline = klineData[i];
      const high = parseFloat(kline.high);
      const low = parseFloat(kline.low);
      const close = parseFloat(kline.close);

      if (isNaN(high) || isNaN(low) || isNaN(close)) {
        continue;
      }

      if (isBuy) {
        if (low <= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'stopLoss';
          exitTime = new Date(kline.timestamp);
          break;
        }
        if (high >= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'takeProfit';
          exitTime = new Date(kline.timestamp);
          break;
        }
      } else {
        if (high >= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'stopLoss';
          exitTime = new Date(kline.timestamp);
          break;
        }
        if (low <= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'takeProfit';
          exitTime = new Date(kline.timestamp);
          break;
        }
      }

      exitPrice = close;
      exitTime = new Date(kline.timestamp);
    }

    const tradeReturn = isBuy
      ? (exitPrice - entryPrice) / entryPrice
      : (entryPrice - exitPrice) / entryPrice;

    return {
      signalId: signal.id,
      stockCode: signal.stockCode ?? '',
      stockName: signal.stockName ?? '',
      direction: signal.direction ?? '',
      entryPrice,
      exitPrice,
      return: tradeReturn,
      exitReason,
      entryTime: signalTime,
      exitTime,
    };
  }

  private calculateStatistics(trades: TradeResult[]): BacktestResponse {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        avgReturn: 0,
        trades: [],
      };
    }

    const winningTrades = trades.filter((t) => t.return > 0);
    const losingTrades = trades.filter((t) => t.return <= 0);

    const totalReturn = trades.reduce((sum, t) => sum + t.return, 0);
    const avgReturn = totalReturn / trades.length;
    const winRate = winningTrades.length / trades.length;

    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeReturn = 0;

    for (const trade of trades) {
      cumulativeReturn += trade.return;
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = peak - cumulativeReturn;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalReturn,
      maxDrawdown,
      avgReturn,
      trades,
    };
  }

  private async saveBacktestRecord(
    dto: BacktestRequestDto,
    result: BacktestResponse,
    period: string,
  ): Promise<void> {
    const record: NewBacktestRecord = {
      stockCode: dto.stockCode || null,
      startTime: dto.startTime,
      endTime: dto.endTime,
      minConfidence: dto.minConfidence,
      maxConfidence: dto.maxConfidence,
      directions: dto.directions,
      stopLoss: dto.stopLoss.toString(),
      takeProfit: dto.takeProfit.toString(),
      period,
      totalTrades: result.totalTrades,
      winningTrades: result.winningTrades,
      losingTrades: result.losingTrades,
      winRate: result.winRate.toString(),
      totalReturn: result.totalReturn.toString(),
      maxDrawdown: result.maxDrawdown.toString(),
      avgReturn: result.avgReturn.toString(),
      trades: result.trades,
    };

    await this.dbService.db.insert(backtestRecords).values(record);
    this.logger.log(`Saved backtest record with ${result.totalTrades} trades`);
  }

  async findAllRecords(stockCode?: string, limit: number = 50): Promise<BacktestRecord[]> {
    if (stockCode) {
      return this.dbService.db
        .select()
        .from(backtestRecords)
        .where(eq(backtestRecords.stockCode, stockCode))
        .orderBy(desc(backtestRecords.createdAt))
        .limit(limit);
    }

    return this.dbService.db
      .select()
      .from(backtestRecords)
      .orderBy(desc(backtestRecords.createdAt))
      .limit(limit);
  }

  async findRecordById(id: string): Promise<BacktestRecord | null> {
    const [record] = await this.dbService.db
      .select()
      .from(backtestRecords)
      .where(eq(backtestRecords.id, id))
      .limit(1);
    return record || null;
  }

  async deleteRecord(id: string): Promise<void> {
    await this.dbService.db
      .delete(backtestRecords)
      .where(eq(backtestRecords.id, id));
    this.logger.log(`Deleted backtest record: ${id}`);
  }
}
