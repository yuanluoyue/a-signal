import { Logger } from '@nestjs/common';
import { AgentState } from '../types/agent-state.js';
import { VolcengineService } from '../../volcengine/volcengine.service.js';

const logger = new Logger('finalNode');

const SYSTEM_PROMPT = `你是专业的股票投资研究助手，基于提供的工具数据回答用户问题。

重要规则：
1. 必须基于提供的工具数据进行分析，禁止编造数据
2. 如果是投资分析，必须按照以下格式输出：

【结论】
简要总结分析结论

【理由】
详细说明分析依据

【风险】
提示潜在风险因素

【数据来源】
列出使用的数据来源

3. 不允许直接给出确定性买卖建议，只能提供分析参考
4. 保持专业、客观的语气`;

const FINAL_PROMPT = `用户意图：{{intent}}
用户问题：{{userInput}}

历史对话：
{{chatHistory}}

相关记忆：
{{relevantMemories}}

工具调用结果：
{{observations}}

请基于以上数据回答用户问题。`;

export async function finalNode(
  state: AgentState,
  volcengineService: VolcengineService,
): Promise<Partial<AgentState>> {
  logger.debug(`[finalNode] Generating final answer`);

  try {
    const chatHistoryText = state.chatHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const relevantMemoriesText = state.relevantMemories.length > 0
      ? state.relevantMemories.join('\n')
      : '无';

    const observationsText = state.observations.length > 0
      ? state.observations
          .map((obs) => `[${obs.toolName}]: ${JSON.stringify(obs.output).slice(0, 1000)}`)
          .join('\n')
      : '无工具调用';

    const prompt = FINAL_PROMPT
      .replace('{{intent}}', state.intent || 'general_chat')
      .replace('{{userInput}}', state.userInput)
      .replace('{{chatHistory}}', chatHistoryText || '无')
      .replace('{{relevantMemories}}', relevantMemoriesText)
      .replace('{{observations}}', observationsText);

    const response = await volcengineService.chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, maxTokens: 2000 },
    );

    logger.debug(`[finalNode] Generated answer length: ${response.length}`);

    return { finalAnswer: response.trim() };
  } catch (error) {
    logger.error(`[finalNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      finalAnswer: '抱歉，生成回答时出现错误。请稍后重试。',
    };
  }
}
