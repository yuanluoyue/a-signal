import { Injectable, Logger } from '@nestjs/common';
import { AgentGraph, type GraphEvent } from './graph/agent-graph.js';
import { MemoryService } from './memory/memory.service.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  userId: string;
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
}

@Injectable()
export class ResearchAgentService {
  private readonly logger = new Logger(ResearchAgentService.name);

  constructor(
    private readonly agentGraph: AgentGraph,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * 处理聊天请求（流式输出）
   */
  async *chat(request: ChatRequest): AsyncGenerator<GraphEvent> {
    const sessionId = request.sessionId || this.generateSessionId();
    const { userId, message } = request;

    this.logger.log(`[ResearchAgentService] Chat started - user: ${userId}, session: ${sessionId}`);

    try {
      // 先保存用户消息
      await this.memoryService.saveUserMessage(userId, sessionId, message);

      // 执行 Graph 流
      for await (const event of this.agentGraph.stream(userId, sessionId, message)) {
        yield event;
      }

      this.logger.log(`[ResearchAgentService] Chat completed - session: ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `[ResearchAgentService] Chat error: ${error instanceof Error ? error.message : String(error)}`,
      );
      yield {
        type: 'answer',
        data: { chunk: '抱歉，处理请求时出现错误。请稍后重试。' },
      };
      yield { type: 'done', data: {} };
    }
  }

  /**
   * 处理聊天请求（非流式）
   */
  async chatSync(request: ChatRequest): Promise<ChatResponse> {
    const sessionId = request.sessionId || this.generateSessionId();
    const { userId, message } = request;

    this.logger.log(`[ResearchAgentService] Sync chat started - user: ${userId}, session: ${sessionId}`);

    try {
      // 先保存用户消息
      await this.memoryService.saveUserMessage(userId, sessionId, message);

      // 执行 Graph
      const result = await this.agentGraph.execute(userId, sessionId, message);

      this.logger.log(`[ResearchAgentService] Sync chat completed - session: ${sessionId}`);

      return {
        message: result.state.finalAnswer || '抱歉，无法生成回答。',
        sessionId,
      };
    } catch (error) {
      this.logger.error(
        `[ResearchAgentService] Sync chat error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        message: '抱歉，处理请求时出现错误。请稍后重试。',
        sessionId,
      };
    }
  }

  /**
   * 获取会话历史
   */
  async getChatHistory(userId: string, sessionId: string): Promise<ChatMessage[]> {
    this.logger.log(`[ResearchAgentService] Getting history for user: ${userId}, session: ${sessionId}`);
    try {
      const messages = await this.memoryService.getRecentMessages(userId, sessionId, 50);
      this.logger.log(`[ResearchAgentService] Found ${messages.length} messages`);

      return messages
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
    } catch (error) {
      this.logger.error(
        `[ResearchAgentService] Get history error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userId: string): Promise<string[]> {
    return this.memoryService.getUserSessions(userId);
  }

  /**
   * 更新会话标题
   */
  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
    this.logger.log(`[ResearchAgentService] Updating session title - session: ${sessionId}, title: ${title}`);
    await this.memoryService.updateSessionTitle(userId, sessionId, title);
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`[ResearchAgentService] Deleting session - session: ${sessionId}`);
    await this.memoryService.deleteSession(userId, sessionId);
  }

  /**
   * 清除会话历史
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    // TODO: 实现清除会话的逻辑
    this.logger.log(`[ResearchAgentService] Clearing session: ${sessionId} for user: ${userId}`);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
