import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, gte, lte, inArray, desc, eq, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { KlinesService, KlinePeriod } from '../klines/klines.service.js';
import { StrategyService } from '../strategy/strategy.service.js';
import {
  signals,
  klines,
  backtestRecords,
  backtestTrades,
  Signal,
  type NewBacktestRecord,
  type NewBacktestTrade,
  type BacktestRecord,
  type BacktestTrade,
} from '../../core/db/schema.js';
import { StrategyBacktestRequestDto, BacktestTradeResult, BacktestStatistics } from '../../interfaces/admin/backtest/dto/backtest.dto.js';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly klinesService: KlinesService,
    private readonly strategyService: StrategyService,
  ) {}

  async createBacktest(dto: StrategyBacktestRequestDto, userId: string): Promise<BacktestRecord> {
    const strategy = await this.strategyService.findById(dto.strategyId);
    if (!strategy) {
      throw new NotFoundException(`Strategy ${dto.strategyId} not found`);
    }

    const strategySnapshot: Record<string, unknown> = {
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      enabled: strategy.enabled,
      minScore: strategy.minScore,
      maxScore: strategy.maxScore,
      allowedRuleIds: strategy.allowedRuleIds,
      allowedCategories: strategy.allowedCategories,
      directionMode: strategy.directionMode,
      entryMode: strategy.entryMode,
      holdPeriod: strategy.holdPeriod,
      stopLossPct: strategy.stopLossPct,
      takeProfitPct: strategy.takeProfitPct,
      maxSignalsPerDay: strategy.maxSignalsPerDay,
      maxPositions: strategy.maxPositions,
    };

    const klinePeriod: KlinePeriod = dto.period || '4h';

    const [record] = await this.dbService.db
      .insert(backtestRecords)
      .values({
        userId,
        name: dto.name || `${strategy.name} 回测`,
        description: null,
        strategyId: strategy.id,
        strategySnapshot,
        stockCode: dto.stockCode || null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        period: klinePeriod,
        totalSignals: 0,
        filteredSignals: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: '0',
        totalReturnPct: '0',
        avgReturnPct: '0',
        maxDrawdownPct: '0',
        equityCurve: [],
        status: 'running',
        errorMessage: null,
      })
      .returning();

    this.logger.log(`[BacktestService] Created backtest record: ${record.id}, status=running`);

    this.executeBacktest(record.id, dto, strategy, klinePeriod, userId).catch((err) => {
      this.logger.error(`[BacktestService] Unhandled error in executeBacktest for ${record.id}: ${err instanceof Error ? err.message : String(err)}`);
    });

    return record;
  }

  private async executeBacktest(
    recordId: string,
    dto: StrategyBacktestRequestDto,
    strategy: Awaited<ReturnType<StrategyService['findById']>>,
    klinePeriod: KlinePeriod,
    userId: string,
  ): Promise<void> {
    this.logger.log(`[BacktestService] Starting backtest execution: ${recordId}`);

    try {
      const allSignals = await this.queryAllSignals(dto);
      this.logger.log(`[BacktestService] [${recordId}] Found ${allSignals.length} total signals in time range`);

      const filteredSignals = this.filterSignalsByStrategy(allSignals, strategy!);
      this.logger.log(`[BacktestService] [${recordId}] Filtered to ${filteredSignals.length} signals matching strategy`);

      const stockCodes = [...new Set(filteredSignals.map(s => s.symbol).filter((code): code is string => code !== null))];
      if (stockCodes.length > 0) {
        this.logger.log(`[BacktestService] [${recordId}] Checking and updating klines for ${stockCodes.length} stocks...`);
        const updateResult = await this.klinesService.checkAndUpdateKlinesForBacktest(stockCodes);
        this.logger.log(`[BacktestService] [${recordId}] Klines update completed: ${updateResult.updated} updated, ${updateResult.failed} failed`);
      }

      const trades: BacktestTradeResult[] = [];

      for (const signal of filteredSignals) {
        try {
          const trade = await this.simulateTrade(signal, strategy!, dto, klinePeriod);
          if (trade) {
            trades.push(trade);
          }
        } catch (error) {
          this.logger.error(
            `[BacktestService] [${recordId}] Failed to simulate trade for signal ${signal.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const stats = this.calculateStatistics(trades);

      await this.dbService.db
        .update(backtestRecords)
        .set({
          totalSignals: allSignals.length,
          filteredSignals: filteredSignals.length,
          totalTrades: stats.totalTrades,
          winningTrades: stats.winningTrades,
          losingTrades: stats.losingTrades,
          winRate: stats.winRate.toString(),
          totalReturnPct: stats.totalReturnPct.toString(),
          avgReturnPct: stats.avgReturnPct.toString(),
          maxDrawdownPct: stats.maxDrawdownPct.toString(),
          sharpeRatio: stats.sharpeRatio?.toString() || null,
          profitFactor: stats.profitFactor?.toString() || null,
          avgHoldingPeriod: stats.avgHoldingPeriod?.toString() || null,
          equityCurve: stats.equityCurve,
          status: 'completed',
          errorMessage: null,
        })
        .where(eq(backtestRecords.id, recordId));

      if (trades.length > 0) {
        const tradeValues: NewBacktestTrade[] = trades.map((t) => ({
          userId,
          backtestId: recordId,
          strategyId: strategy!.id,
          signalId: t.signalId || null,
          eventId: t.eventId || null,
          symbol: t.symbol,
          stockName: t.stockName || null,
          direction: t.direction,
          entryTime: t.entryTime,
          entryPrice: t.entryPrice.toString(),
          exitTime: t.exitTime || null,
          exitPrice: t.exitPrice?.toString() || null,
          pnlPct: t.pnlPct?.toString() || null,
          signalScore: t.signalScore || null,
          signalRuleId: t.signalRuleId || null,
          signalReason: t.signalReason || null,
          exitReason: t.exitReason || null,
          stopLossPrice: t.stopLossPrice?.toString() || null,
          takeProfitPrice: t.takeProfitPrice?.toString() || null,
        }));

        await this.dbService.db.insert(backtestTrades).values(tradeValues);
      }

      this.logger.log(`[BacktestService] [${recordId}] Backtest completed: ${stats.totalTrades} trades, winRate=${stats.winRate.toFixed(4)}, totalReturn=${stats.totalReturnPct.toFixed(4)}`);
    } catch (error) {
      await this.dbService.db
        .update(backtestRecords)
        .set({
          totalSignals: 0,
          filteredSignals: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: '0',
          totalReturnPct: '0',
          avgReturnPct: '0',
          maxDrawdownPct: '0',
          equityCurve: [],
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(backtestRecords.id, recordId));

      this.logger.error(`[BacktestService] [${recordId}] Backtest failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async queryAllSignals(dto: StrategyBacktestRequestDto): Promise<Signal[]> {
    const conditions = [
      gte(signals.generatedAt, dto.startTime),
      lte(signals.generatedAt, dto.endTime),
    ];

    if (dto.stockCode) {
      conditions.push(eq(signals.symbol, dto.stockCode));
    }

    const results = await this.dbService.db
      .select()
      .from(signals)
      .where(and(...conditions))
      .orderBy(signals.generatedAt);

    return results;
  }

  private filterSignalsByStrategy(allSignals: Signal[], strategy: { minScore: string; maxScore: string | null; allowedRuleIds: string[] | null; allowedCategories: string[] | null; directionMode: string }): Signal[] {
    let filtered = allSignals;

    const minScore = parseFloat(strategy.minScore);
    filtered = filtered.filter((s) => {
      const score = parseFloat(s.score || '0');
      return Math.abs(score) >= minScore;
    });

    if (strategy.maxScore) {
      const maxScore = parseFloat(strategy.maxScore);
      filtered = filtered.filter((s) => {
        const score = parseFloat(s.score || '0');
        return Math.abs(score) <= maxScore;
      });
    }

    if (strategy.directionMode === 'long_only') {
      filtered = filtered.filter((s) => s.action === 'long');
    } else if (strategy.directionMode === 'short_only') {
      filtered = filtered.filter((s) => s.action === 'short');
    }

    if (strategy.allowedRuleIds && strategy.allowedRuleIds.length > 0) {
      filtered = filtered.filter((s) => s.ruleId && strategy.allowedRuleIds!.includes(s.ruleId));
    }

    return filtered;
  }

  private async simulateTrade(
    signal: Signal,
    strategy: { holdPeriod: number; stopLossPct: string | null; takeProfitPct: string | null },
    dto: StrategyBacktestRequestDto,
    period: KlinePeriod,
  ): Promise<BacktestTradeResult | null> {
    const signalTime = new Date(signal.generatedAt ?? new Date());

    const klineData = await this.klinesService.getKlines(
      signal.symbol ?? '',
      period,
      signalTime,
      dto.endTime,
    );

    if (klineData.length === 0) {
      this.logger.warn(`No kline data found for ${signal.symbol} after ${signalTime.toISOString()}`);
      return null;
    }

    const entryKline = klineData[0];
    const entryPrice = parseFloat(entryKline.close);

    if (isNaN(entryPrice) || entryPrice <= 0) {
      this.logger.warn(`Invalid entry price for signal ${signal.id}: ${entryKline.close}`);
      return null;
    }

    const isLong = signal.action === 'long';
    const stopLossPct = strategy.stopLossPct ? parseFloat(strategy.stopLossPct) : null;
    const takeProfitPct = strategy.takeProfitPct ? parseFloat(strategy.takeProfitPct) : null;

    const stopLossPrice = stopLossPct !== null
      ? (isLong ? entryPrice * (1 - stopLossPct) : entryPrice * (1 + stopLossPct))
      : null;
    const takeProfitPrice = takeProfitPct !== null
      ? (isLong ? entryPrice * (1 + takeProfitPct) : entryPrice * (1 - takeProfitPct))
      : null;

    const maxKlines = strategy.holdPeriod + 1;
    const limitedKlines = klineData.slice(0, maxKlines);

    let exitPrice = entryPrice;
    let exitReason: 'hold_period' | 'stop_loss' | 'take_profit' = 'hold_period';
    let exitTime = signalTime;

    for (let i = 1; i < limitedKlines.length; i++) {
      const kline = limitedKlines[i];
      const high = parseFloat(kline.high);
      const low = parseFloat(kline.low);
      const close = parseFloat(kline.close);

      if (isNaN(high) || isNaN(low) || isNaN(close)) {
        continue;
      }

      if (isLong) {
        if (stopLossPrice !== null && low <= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'stop_loss';
          exitTime = new Date(kline.timestamp);
          break;
        }
        if (takeProfitPrice !== null && high >= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'take_profit';
          exitTime = new Date(kline.timestamp);
          break;
        }
      } else {
        if (stopLossPrice !== null && high >= stopLossPrice) {
          exitPrice = stopLossPrice;
          exitReason = 'stop_loss';
          exitTime = new Date(kline.timestamp);
          break;
        }
        if (takeProfitPrice !== null && low <= takeProfitPrice) {
          exitPrice = takeProfitPrice;
          exitReason = 'take_profit';
          exitTime = new Date(kline.timestamp);
          break;
        }
      }

      exitPrice = close;
      exitTime = new Date(kline.timestamp);
    }

    const pnlPct = isLong
      ? (exitPrice - entryPrice) / entryPrice
      : (entryPrice - exitPrice) / entryPrice;

    return {
      signalId: signal.id || null,
      eventId: signal.eventId || null,
      symbol: signal.symbol || '',
      stockName: null,
      direction: signal.action || 'long',
      entryTime: signalTime,
      entryPrice,
      exitTime,
      exitPrice,
      pnlPct,
      signalScore: signal.score || null,
      signalRuleId: signal.ruleId || null,
      signalReason: signal.reason || null,
      exitReason,
      stopLossPrice,
      takeProfitPrice,
    };
  }

  private calculateStatistics(trades: BacktestTradeResult[]): BacktestStatistics {
    if (trades.length === 0) {
      return {
        totalSignals: 0,
        filteredSignals: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturnPct: 0,
        avgReturnPct: 0,
        maxDrawdownPct: 0,
        sharpeRatio: null,
        profitFactor: null,
        avgHoldingPeriod: null,
        equityCurve: [],
      };
    }

    const winningTrades = trades.filter((t) => (t.pnlPct ?? 0) > 0);
    const losingTrades = trades.filter((t) => (t.pnlPct ?? 0) <= 0);

    const totalReturnPct = trades.reduce((sum, t) => sum + (t.pnlPct ?? 0), 0);
    const avgReturnPct = totalReturnPct / trades.length;
    const winRate = winningTrades.length / trades.length;

    let maxDrawdownPct = 0;
    let peak = 0;
    let cumulativeReturn = 0;
    const equityCurve: Array<{ time: string; equity: number }> = [];
    let equity = 1;

    for (const trade of trades) {
      cumulativeReturn += trade.pnlPct ?? 0;
      equity *= (1 + (trade.pnlPct ?? 0));
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = peak - cumulativeReturn;
      if (drawdown > maxDrawdownPct) {
        maxDrawdownPct = drawdown;
      }
      equityCurve.push({
        time: trade.entryTime.toISOString(),
        equity,
      });
    }

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnlPct ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnlPct ?? 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

    const returns = trades.map((t) => t.pnlPct ?? 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : null;

    const holdingPeriods = trades
      .filter((t) => t.entryTime && t.exitTime)
      .map((t) => {
        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime!).getTime();
        return (exit - entry) / (1000 * 60 * 60 * 24);
      });
    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
      : null;

    return {
      totalSignals: 0,
      filteredSignals: 0,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalReturnPct,
      avgReturnPct,
      maxDrawdownPct,
      sharpeRatio,
      profitFactor,
      avgHoldingPeriod,
      equityCurve,
    };
  }

  async findAllRecords(userId: string, stockCode?: string, strategyId?: string, limit: number = 50): Promise<BacktestRecord[]> {
    const conditions: ReturnType<typeof eq>[] = [];

    conditions.push(eq(backtestRecords.userId, userId));

    if (stockCode) {
      conditions.push(eq(backtestRecords.stockCode, stockCode));
    }
    if (strategyId) {
      conditions.push(eq(backtestRecords.strategyId, strategyId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.dbService.db
      .select()
      .from(backtestRecords)
      .where(whereClause || sql`1=1`)
      .orderBy(desc(backtestRecords.createdAt))
      .limit(limit);
  }

  async findRecordById(id: string, userId: string): Promise<BacktestRecord | null> {
    const [record] = await this.dbService.db
      .select()
      .from(backtestRecords)
      .where(and(eq(backtestRecords.id, id), eq(backtestRecords.userId, userId)))
      .limit(1);
    return record || null;
  }

  async findTradesByBacktestId(backtestId: string, userId: string): Promise<BacktestTrade[]> {
    return this.dbService.db
      .select()
      .from(backtestTrades)
      .where(and(eq(backtestTrades.backtestId, backtestId), eq(backtestTrades.userId, userId)))
      .orderBy(backtestTrades.entryTime);
  }

  async deleteRecord(id: string, userId: string): Promise<void> {
    const record = await this.findRecordById(id, userId);
    if (!record) {
      throw new NotFoundException(`Backtest record with id ${id} not found`);
    }

    await this.dbService.db
      .delete(backtestTrades)
      .where(eq(backtestTrades.backtestId, id));

    await this.dbService.db
      .delete(backtestRecords)
      .where(eq(backtestRecords.id, id));
    this.logger.log(`Deleted backtest record and trades: ${id}`);
  }
}
