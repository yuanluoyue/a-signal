import { Logger } from '@nestjs/common';
import { AgentState } from '../types/agent-state.js';
import { MemoryService } from '../memory/memory.service.js';

const logger = new Logger('memorySaveNode');

export async function memorySaveNode(
  state: AgentState,
  memoryService: MemoryService,
): Promise<Partial<AgentState>> {
  logger.log(`[memorySaveNode] Saving conversation for user: ${state.userId}, session: ${state.sessionId}`);

  try {
    if (!state.finalAnswer) {
      logger.warn(`[memorySaveNode] No final answer to save`);
      return {};
    }

    await memoryService.saveAssistantMessage(
      state.userId,
      state.sessionId,
      state.finalAnswer,
    );
    logger.log(`[memorySaveNode] Saved assistant message`);

    const isAnalysisIntent =
      state.intent === 'portfolio_analysis' ||
      state.intent === 'report_analysis' ||
      state.intent === 'signal_analysis';

    const hasToolData = state.observations.length > 0;

    const shouldSaveToVector =
      state.finalAnswer.length > 200 &&
      isAnalysisIntent &&
      hasToolData;

    if (shouldSaveToVector) {
      try {
        await memoryService.saveToVectorMemory(state.finalAnswer, {
          userId: state.userId,
          sessionId: state.sessionId,
          type: 'analysis',
          topic: state.userInput.slice(0, 50),
          createdAt: new Date().toISOString(),
        });
        logger.log(`[memorySaveNode] Saved to vector memory (intent: ${state.intent}, tools: ${state.observations.length})`);
      } catch (error) {
        logger.warn(
          `[memorySaveNode] Failed to save to vector memory: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      logger.debug(`[memorySaveNode] Skip vector memory - intent: ${state.intent}, tools: ${state.observations.length}, length: ${state.finalAnswer.length}`);
    }

    logger.log(`[memorySaveNode] Conversation saved`);
    return {};
  } catch (error) {
    logger.error(`[memorySaveNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}
