import { Logger } from '@nestjs/common';
import { AgentState } from '../types/agent-state.js';
import { VolcengineService } from '../../../core/volcengine/volcengine.service.js';
import { ToolRegistryService } from '../tools/index.js';

const logger = new Logger('plannerNode');

const PLANNER_PROMPT = `你是专业的投资分析规划助手，负责制定工具调用计划。

可用工具：
{{toolDescriptions}}

用户意图：{{intent}}
用户输入：{{userInput}}
历史对话：
{{chatHistory}}

请制定一个工具调用计划，以 JSON 数组格式返回需要调用的工具名称列表。
例如：["get_user_portfolio"] 或 ["get_reports_by_stock", "get_backtest_by_stock"]

只返回 JSON 数组，不要其他内容。`;

export async function plannerNode(
  state: AgentState,
  volcengineService: VolcengineService,
  toolRegistryService: ToolRegistryService,
): Promise<Partial<AgentState>> {
  logger.log(`[plannerNode] Creating plan for intent: ${state.intent}`);

  if (state.intent === 'general_chat') {
    logger.log(`[plannerNode] General chat, no tools needed`);
    return { plan: [], currentStep: 0 };
  }

  try {
    const chatHistoryText = state.chatHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const toolDescriptions = toolRegistryService.getToolDescriptions();

    const prompt = PLANNER_PROMPT
      .replace('{{toolDescriptions}}', toolDescriptions)
      .replace('{{intent}}', state.intent || 'unknown')
      .replace('{{userInput}}', state.userInput)
      .replace('{{chatHistory}}', chatHistoryText || '无');

    const response = await volcengineService.chatCompletion(
      [
        { role: 'system', content: '你是一个规划助手，只返回 JSON 数组格式的工具列表。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 200 },
    );

    let plan: string[] = [];
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      plan = JSON.parse(cleaned);
      if (!Array.isArray(plan)) {
        plan = [];
      }
    } catch {
      logger.warn(`[plannerNode] Failed to parse plan JSON: ${response}`);
      plan = [];
    }

    const validTools = toolRegistryService.getAllTools().map((t) => t.name);
    plan = plan.filter((toolName) => validTools.includes(toolName));

    logger.log(`[plannerNode] Created plan: ${JSON.stringify(plan)}`);

    return { plan, currentStep: 0 };
  } catch (error) {
    logger.error(`[plannerNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return { plan: [], currentStep: 0 };
  }
}
