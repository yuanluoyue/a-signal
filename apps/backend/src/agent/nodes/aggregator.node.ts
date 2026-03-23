import { Logger } from '@nestjs/common';
import { AgentState } from '../types/agent-state.js';

const logger = new Logger('aggregatorNode');

export async function aggregatorNode(state: AgentState): Promise<Partial<AgentState>> {
  logger.debug(`[aggregatorNode] Aggregating ${state.observations.length} observations`);

  if (state.observations.length === 0) {
    logger.debug(`[aggregatorNode] No observations to aggregate`);
    return {};
  }

  // 构建聚合上下文
  const aggregatedContext = state.observations
    .map((obs, index) => {
      const outputStr = typeof obs.output === 'object'
        ? JSON.stringify(obs.output, null, 2).slice(0, 1000)
        : String(obs.output).slice(0, 1000);

      return `[工具 ${index + 1}: ${obs.toolName}]\n输入: ${JSON.stringify(obs.input)}\n输出: ${outputStr}`;
    })
    .join('\n\n');

  logger.debug(`[aggregatorNode] Aggregated context length: ${aggregatedContext.length}`);

  // 将聚合结果存储在 finalAnswer 字段中供 finalNode 使用
  return {
    finalAnswer: aggregatedContext,
  };
}
