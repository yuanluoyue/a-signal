import { Logger } from '@nestjs/common';
import { AgentState, Observation } from '../types/agent-state.js';
import { ToolRegistryService } from '../tools/index.js';
import { MemoryService } from '../memory/memory.service.js';

const logger = new Logger('toolNode');

export async function toolNode(
  state: AgentState,
  toolRegistryService: ToolRegistryService,
  memoryService: MemoryService,
): Promise<Partial<AgentState>> {
  const currentStep = state.currentStep || 0;
  const plan = state.plan || [];

  if (currentStep >= plan.length) {
    logger.debug(`[toolNode] All tools executed`);
    return {};
  }

  const toolName = plan[currentStep];
  logger.log(`[toolNode] Executing tool ${currentStep + 1}/${plan.length}: ${toolName}`);

  try {
    const tool = toolRegistryService.getTool(toolName);

    if (!tool) {
      logger.warn(`[toolNode] Tool not found: ${toolName}`);
      const errorObservation: Observation = {
        toolName,
        input: {},
        output: { error: `Tool not found: ${toolName}` },
        timestamp: new Date(),
      };
      return {
        observations: [...state.observations, errorObservation],
        currentStep: currentStep + 1,
      };
    }

    // 构建工具输入参数
    const toolInput = buildToolInput(toolName, state);

    logger.log(`[toolNode] Tool input: ${JSON.stringify(toolInput)}, state.userId: ${state.userId}`);

    // 执行工具
    const output = await tool.execute(toolInput);

    logger.log(`[toolNode] Tool output: ${JSON.stringify(output).slice(0, 500)}...`);

    // 保存工具调用到记忆
    await memoryService.saveToolMessage(
      state.userId,
      state.sessionId,
      toolName,
      toolInput,
      output,
    );

    const observation: Observation = {
      toolName,
      input: toolInput,
      output,
      timestamp: new Date(),
    };

    return {
      observations: [...state.observations, observation],
      currentStep: currentStep + 1,
    };
  } catch (error) {
    logger.error(`[toolNode] Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}`);

    const errorObservation: Observation = {
      toolName,
      input: {},
      output: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date(),
    };

    return {
      observations: [...state.observations, errorObservation],
      currentStep: currentStep + 1,
    };
  }
}

function buildToolInput(toolName: string, state: AgentState): Record<string, unknown> {
  const input: Record<string, unknown> = {};

  switch (toolName) {
    case 'get_user_portfolio':
      input.userId = state.userId;
      break;

    case 'get_news_by_date_range': {
      // 从用户输入中提取日期范围，默认最近7天
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      input.startDate = startDate.toISOString().split('T')[0];
      input.endDate = endDate.toISOString().split('T')[0];
      input.limit = 10;
      break;
    }

    case 'search_news_by_keyword':
      // 使用用户输入作为关键词
      input.keyword = state.userInput.slice(0, 50);
      input.limit = 5;
      break;

    case 'get_signals_by_date_range': {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      input.startDate = startDate.toISOString().split('T')[0];
      input.endDate = endDate.toISOString().split('T')[0];
      input.limit = 20;
      break;
    }

    case 'get_reports_by_stock':
      // 从用户输入中提取股票代码
      input.stockCode = extractStockCode(state.userInput) || '000001';
      break;

    case 'get_backtest_by_stock':
      input.stockCode = extractStockCode(state.userInput);
      input.limit = 5;
      break;

    default:
      break;
  }

  return input;
}

function extractStockCode(input: string): string | null {
  // 匹配6位数字股票代码
  const match = input.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}
