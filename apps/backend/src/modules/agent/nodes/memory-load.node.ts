import { Logger } from '@nestjs/common';
import { AgentState } from '../types/agent-state.js';
import { MemoryService } from '../memory/memory.service.js';

const logger = new Logger('memoryLoadNode');

export async function memoryLoadNode(
  state: AgentState,
  memoryService: MemoryService,
): Promise<Partial<AgentState>> {
  logger.log(`[memoryLoadNode] Loading memories for user: ${state.userId}, session: ${state.sessionId}`);

  try {
    const { chatHistory, relevantMemories } = await memoryService.loadMemories(
      state.userId,
      state.sessionId,
      state.userInput,
    );

    logger.log(`[memoryLoadNode] Loaded ${chatHistory.length} messages, ${relevantMemories.length} memories`);

    return {
      chatHistory,
      relevantMemories,
    };
  } catch (error) {
    logger.error(`[memoryLoadNode] Error loading memories: ${error instanceof Error ? error.message : String(error)}`);
    return {
      chatHistory: [],
      relevantMemories: [],
    };
  }
}
