import { Injectable, Logger } from '@nestjs/common';
import { PgMemoryRepository } from './pg-memory.repository.js';
import { VectorMemoryService } from './vector-memory.service.js';
import { Message } from '../types/agent-state.js';
import { type VectorMemoryMetadata } from './vector-memory.service.js';
import type { ChatMessage, NewChatMessage } from '../../database/schema.js';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly pgMemoryRepository: PgMemoryRepository,
    private readonly vectorMemoryService: VectorMemoryService,
  ) {}

  /**
   * 获取最近的对话历史
   */
  async getRecentMessages(
    userId: string,
    sessionId: string,
    limit: number = 15,
  ): Promise<Message[]> {
    this.logger.log(`[MemoryService] Getting recent messages for user: ${userId}, session: ${sessionId}`);

    const messages = await this.pgMemoryRepository.getRecentMessages(userId, sessionId, limit);
    this.logger.log(`[MemoryService] Retrieved ${messages.length} messages from DB`);

    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'tool',
      content: msg.content,
      toolName: msg.toolName || undefined,
      toolInput: msg.toolInput ? (msg.toolInput as Record<string, unknown>) : undefined,
      toolOutput: msg.toolOutput || undefined,
    }));
  }

  /**
   * 保存消息
   */
  async saveMessage(message: NewChatMessage): Promise<ChatMessage | null> {
    this.logger.debug(`[MemoryService] Saving message: ${message.role}`);
    return this.pgMemoryRepository.saveMessage(message);
  }

  /**
   * 保存用户消息
   */
  async saveUserMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`[MemoryService] Saving user message`);
    return this.pgMemoryRepository.saveUserMessage(userId, sessionId, content);
  }

  /**
   * 保存助手消息
   */
  async saveAssistantMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`[MemoryService] Saving assistant message`);
    return this.pgMemoryRepository.saveAssistantMessage(userId, sessionId, content);
  }

  /**
   * 保存工具调用消息
   */
  async saveToolMessage(
    userId: string,
    sessionId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolOutput: unknown,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`[MemoryService] Saving tool message: ${toolName}`);
    return this.pgMemoryRepository.saveToolMessage(
      userId,
      sessionId,
      toolName,
      toolInput,
      toolOutput,
    );
  }

  /**
   * 获取相关记忆
   */
  async getRelevantMemories(
    query: string,
    userId: string,
    limit: number = 5,
  ): Promise<string[]> {
    this.logger.debug(`[MemoryService] Getting relevant memories for query: ${query}`);
    return this.vectorMemoryService.searchRelevantMemories(query, userId, limit);
  }

  /**
   * 保存到向量记忆
   */
  async saveToVectorMemory(
    content: string,
    metadata: VectorMemoryMetadata,
  ): Promise<void> {
    this.logger.debug(`[MemoryService] Saving to vector memory`);
    return this.vectorMemoryService.saveMemory(content, metadata);
  }

  /**
   * 加载完整记忆（短期 + 长期）
   */
  async loadMemories(
    userId: string,
    sessionId: string,
    query: string,
  ): Promise<{
    chatHistory: Message[];
    relevantMemories: string[];
  }> {
    this.logger.debug(`[MemoryService] Loading memories for user: ${userId}`);

    const [chatHistory, relevantMemories] = await Promise.all([
      this.getRecentMessages(userId, sessionId),
      this.getRelevantMemories(query, userId),
    ]);

    return {
      chatHistory,
      relevantMemories,
    };
  }

  /**
   * 保存对话到记忆
   */
  async saveConversation(
    userId: string,
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    shouldSaveToVector: boolean = false,
  ): Promise<void> {
    this.logger.debug(`[MemoryService] Saving conversation`);

    // 保存到 PostgreSQL
    await this.saveUserMessage(userId, sessionId, userMessage);
    await this.saveAssistantMessage(userId, sessionId, assistantMessage);

    // 如果需要，保存到向量数据库
    if (shouldSaveToVector && assistantMessage.length > 100) {
      try {
        await this.saveToVectorMemory(assistantMessage, {
          userId,
          sessionId,
          type: 'analysis',
          topic: userMessage.slice(0, 50),
          createdAt: new Date().toISOString(),
        });
        this.logger.debug(`[MemoryService] Saved to vector memory`);
      } catch (error) {
        this.logger.warn(
          `[MemoryService] Failed to save to vector memory: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * 获取用户的所有会话ID列表
   */
  async getUserSessions(userId: string): Promise<string[]> {
    this.logger.debug(`[MemoryService] Getting user sessions for: ${userId}`);
    return this.pgMemoryRepository.getUserSessions(userId);
  }

  /**
   * 更新会话标题
   */
  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
    this.logger.log(`[MemoryService] Updating session title - session: ${sessionId}, title: ${title}`);
    await this.pgMemoryRepository.updateSessionTitle(userId, sessionId, title);
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`[MemoryService] Deleting session - session: ${sessionId}`);
    await this.pgMemoryRepository.deleteSession(userId, sessionId);
  }
}
