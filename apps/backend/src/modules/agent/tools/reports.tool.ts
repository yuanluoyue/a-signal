import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { StockTrackingService } from '../../stock-tracking/stock-tracking.service.js';

const GetReportsByStockSchema = z.object({
  stockCode: z.string().describe('股票代码'),
});

type GetReportsByStockInput = z.infer<typeof GetReportsByStockSchema>;

interface ReportData {
  stockCode: string;
  stockName: string;
  report: string | null;
  reportGeneratedAt: Date | null;
  totalNews: number;
  status: string;
}

@Injectable()
export class GetReportsByStockTool extends BaseTool<GetReportsByStockInput, ReportData> {
  readonly name = 'get_reports_by_stock';
  readonly description = '获取股票的研投报告，包含基于新闻和信号生成的投资分析';
  readonly inputSchema = GetReportsByStockSchema;

  private readonly logger = new Logger(GetReportsByStockTool.name);

  constructor(private readonly stockTrackingService: StockTrackingService) {
    super();
  }

  async execute(input: GetReportsByStockInput): Promise<ReportData> {
    try {
      this.logger.debug(`[GetReportsByStockTool] Executing for stock: ${input.stockCode}`);

      const tracking = await this.stockTrackingService.findByStockCode(input.stockCode);

      if (!tracking) {
        return {
          stockCode: input.stockCode,
          stockName: input.stockCode,
          report: null,
          reportGeneratedAt: null,
          totalNews: 0,
          status: 'not_found',
        };
      }

      const report = await this.stockTrackingService.getResearchReport(tracking.id);

      return {
        stockCode: tracking.stockCode,
        stockName: tracking.stockName,
        report,
        reportGeneratedAt: tracking.reportGeneratedAt,
        totalNews: tracking.totalNews,
        status: tracking.status,
      };
    } catch (error) {
      this.logger.error(`[GetReportsByStockTool] Error: ${this.formatError(error)}`);
      throw error;
    }
  }
}
