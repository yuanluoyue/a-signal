import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { SimulationService } from '../../simulation/simulation.service.js';

const GetUserPortfolioSchema = z.object({
  userId: z.string().describe('用户ID'),
});

type GetUserPortfolioInput = z.infer<typeof GetUserPortfolioSchema>;

interface PortfolioData {
  account: {
    id: string;
    initialCapital: number;
    currentCapital: number;
    availableCash: number;
    totalProfit: number;
    totalReturn: number;
  } | null;
  positions: Array<{
    id: string;
    stockCode: string;
    stockName: string;
    quantity: number;
    avgCost: number;
    currentPrice: number | null;
    marketValue: number | null;
    profit: number;
    return: number;
  }>;
  recentTrades: Array<{
    id: string;
    stockCode: string;
    stockName: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    totalAmount: number;
    profit: number | null;
    tradeTime: Date;
  }>;
}

@Injectable()
export class GetUserPortfolioTool extends BaseTool<GetUserPortfolioInput, PortfolioData> {
  readonly name = 'get_user_portfolio';
  readonly description = '获取用户的模拟账户持仓信息，包括账户资金、持仓列表和最近交易记录';
  readonly inputSchema = GetUserPortfolioSchema;

  private readonly logger = new Logger(GetUserPortfolioTool.name);

  constructor(private readonly simulationService: SimulationService) {
    super();
  }

  async execute(input: GetUserPortfolioInput): Promise<PortfolioData> {
    try {
      this.logger.log(`[GetUserPortfolioTool] Executing for user: ${input.userId}`);

      const account = await this.simulationService.getAccountByUserId(input.userId);
      this.logger.log(`[GetUserPortfolioTool] Account found: ${account ? 'yes' : 'no'}, accountId: ${account?.id}`);

      if (!account) {
        this.logger.warn(`[GetUserPortfolioTool] No account found for user: ${input.userId}`);
        return {
          account: null,
          positions: [],
          recentTrades: [],
        };
      }

      const [positions, trades] = await Promise.all([
        this.simulationService.getPositions(account.id),
        this.simulationService.getTrades(account.id, 10),
      ]);

      this.logger.log(`[GetUserPortfolioTool] Positions count: ${positions.length}, Trades count: ${trades.length}`);

      return {
        account: {
          id: account.id,
          initialCapital: parseFloat(account.initialCapital),
          currentCapital: parseFloat(account.currentCapital),
          availableCash: parseFloat(account.availableCash),
          totalProfit: parseFloat(account.totalProfit),
          totalReturn: parseFloat(account.totalReturn),
        },
        positions: positions.map((pos) => ({
          id: pos.id,
          stockCode: pos.stockCode,
          stockName: pos.stockName,
          quantity: pos.quantity,
          avgCost: parseFloat(pos.avgCost),
          currentPrice: pos.currentPrice ? parseFloat(pos.currentPrice) : null,
          marketValue: pos.marketValue ? parseFloat(pos.marketValue) : null,
          profit: parseFloat(pos.profit),
          return: parseFloat(pos.return),
        })),
        recentTrades: trades.map((trade) => ({
          id: trade.id,
          stockCode: trade.stockCode,
          stockName: trade.stockName,
          type: trade.type as 'buy' | 'sell',
          quantity: trade.quantity,
          price: parseFloat(trade.price),
          totalAmount: parseFloat(trade.totalAmount),
          profit: trade.profit ? parseFloat(trade.profit) : null,
          tradeTime: trade.tradeTime,
        })),
      };
    } catch (error) {
      this.logger.error(`[GetUserPortfolioTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}
