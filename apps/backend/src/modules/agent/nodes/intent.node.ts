import { Logger } from '@nestjs/common';
import { AgentState, AgentIntent } from '../types/agent-state.js';
import { LlmService } from '../../llm/gateway/llm.service.js';

const logger = new Logger('intentNode');

const INTENT_PROMPT = `你是专业的投资分析助手，负责识别用户的意图。

可选意图：
- portfolio_analysis: 用户询问持仓分析、账户情况、盈亏等
- news_analysis: 用户询问新闻分析、市场动态、某股票相关新闻等
- signal_analysis: 用户询问交易信号、买入卖出建议等
- backtest_analysis: 用户询问回测结果、历史表现等
- report_analysis: 用户询问研投报告、股票分析等
- general_chat: 一般性聊天、问候、无关投资的话题

请分析用户输入，返回最匹配的意图。只返回意图名称，不要其他内容。

历史对话：
{{chatHistory}}

用户输入：{{userInput}}

意图：`;

export async function intentNode(
  state: AgentState,
  llmService: LlmService,
): Promise<Partial<AgentState>> {
  logger.log(`[intentNode] Analyzing intent for: ${state.userInput.slice(0, 50)}...`);

  try {
    const chatHistoryText = state.chatHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = INTENT_PROMPT
      .replace('{{chatHistory}}', chatHistoryText || '无')
      .replace('{{userInput}}', state.userInput);

    const response = await llmService.chatCompletion({
      module: 'agent-research',
      task: 'intent',
      messages: [
        { role: 'system', content: '你是一个意图识别助手，只返回意图名称。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 50,
    });

    const intent = response.trim().toLowerCase() as AgentIntent;
    const validIntents: AgentIntent[] = [
      'portfolio_analysis',
      'news_analysis',
      'signal_analysis',
      'backtest_analysis',
      'report_analysis',
      'general_chat',
    ];

    const finalIntent = validIntents.includes(intent) ? intent : 'general_chat';

    logger.log(`[intentNode] Detected intent: ${finalIntent}`);

    return { intent: finalIntent };
  } catch (error) {
    logger.error(`[intentNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return { intent: 'general_chat' };
  }
}
