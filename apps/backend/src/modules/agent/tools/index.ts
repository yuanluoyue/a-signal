import { Injectable, Logger } from '@nestjs/common';
import {
  GetNewsByDateRangeTool,
  SearchNewsByKeywordTool,
} from './news.tool.js';
import { GetUserPortfolioTool } from './portfolio.tool.js';
import { GetSignalsByDateRangeTool } from './signals.tool.js';
import { GetReportsByStockTool } from './reports.tool.js';
import { GetBacktestByStockTool } from './backtest.tool.js';
import {
  type Tool,
  type ToolRegistry,
  createToolRegistry,
  registerTool,
  getTool,
  getAllTools,
  getToolDescriptions,
} from './base.tool.js';

export * from './base.tool.js';
export * from './news.tool.js';
export * from './portfolio.tool.js';
export * from './signals.tool.js';
export * from './reports.tool.js';
export * from './backtest.tool.js';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly registry: ToolRegistry;

  constructor(
    private readonly getNewsByDateRangeTool: GetNewsByDateRangeTool,
    private readonly searchNewsByKeywordTool: SearchNewsByKeywordTool,
    private readonly getUserPortfolioTool: GetUserPortfolioTool,
    private readonly getSignalsByDateRangeTool: GetSignalsByDateRangeTool,
    private readonly getReportsByStockTool: GetReportsByStockTool,
    private readonly getBacktestByStockTool: GetBacktestByStockTool,
  ) {
    this.registry = createToolRegistry();
    this.registerAllTools();
  }

  private registerAllTools(): void {
    registerTool(this.registry, this.getNewsByDateRangeTool);
    registerTool(this.registry, this.searchNewsByKeywordTool);
    registerTool(this.registry, this.getUserPortfolioTool);
    registerTool(this.registry, this.getSignalsByDateRangeTool);
    registerTool(this.registry, this.getReportsByStockTool);
    registerTool(this.registry, this.getBacktestByStockTool);

    this.logger.log(`[ToolRegistryService] Registered ${this.registry.size} tools`);
  }

  getTool(name: string): Tool | undefined {
    return getTool(this.registry, name);
  }

  getAllTools(): Tool[] {
    return getAllTools(this.registry);
  }

  getToolDescriptions(): string {
    return getToolDescriptions(this.registry);
  }

  getRegistry(): ToolRegistry {
    return this.registry;
  }
}
