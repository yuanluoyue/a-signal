import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  chatMessages,
  type ChatMessage,
  type NewChatMessage,
} from '../../database/schema.js';

@Injectable()
export class PgMemoryRepository {
  private readonly logger = new Logger(PgMemoryRepository.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 获取最近的对话历史
   */
  async getRecentMessages(
    userId: string,
    sessionId: string,
    limit: number = 15,
  ): Promise<ChatMessage[]> {
    this.logger.log(`[PgMemoryRepository] Querying messages for user: ${userId}, session: ${sessionId}`);
    try {
      const messages = await this.databaseService.db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.sessionId, sessionId),
          ),
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      this.logger.log(`[PgMemoryRepository] Found ${messages.length} messages in DB`);
      // 按时间正序返回
      return messages.reverse();
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to get recent messages: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 保存消息
   */
  async saveMessage(message: NewChatMessage): Promise<ChatMessage | null> {
    try {
      const [saved] = await this.databaseService.db
        .insert(chatMessages)
        .values(message)
        .returning();

      this.logger.debug(`[PgMemoryRepository] Saved message: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to save message: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * 保存用户消息
   */
  async saveUserMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<ChatMessage | null> {
    return this.saveMessage({
      userId,
      sessionId,
      role: 'user',
      content,
    });
  }

  /**
   * 保存助手消息
   */
  async saveAssistantMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<ChatMessage | null> {
    return this.saveMessage({
      userId,
      sessionId,
      role: 'assistant',
      content,
    });
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
    return this.saveMessage({
      userId,
      sessionId,
      role: 'tool',
      content: `Tool: ${toolName}`,
      toolName,
      toolInput,
      toolOutput,
    });
  }

  /**
   * 获取用户的所有会话ID列表
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      // 使用 group by 获取唯一的 sessionId，并按最新消息时间排序
      const result = await this.databaseService.db
        .select({
          sessionId: chatMessages.sessionId,
          lastMessageTime: sql`MAX(${chatMessages.createdAt})`.as('lastMessageTime'),
        })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .groupBy(chatMessages.sessionId)
        .orderBy(desc(sql`MAX(${chatMessages.createdAt})`));

      return result.map((r) => r.sessionId);
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to get user sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 更新会话标题
   * 将会话中第一条用户消息的内容更新为标题
   */
  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
    this.logger.log(`[PgMemoryRepository] Updating session title - session: ${sessionId}`);
    try {
      // 获取该会话的第一条消息（通常是用户消息）
      const firstMessage = await this.databaseService.db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.sessionId, sessionId),
          ),
        )
        .orderBy(chatMessages.createdAt)
        .limit(1);

      if (firstMessage.length > 0) {
        // 更新第一条消息的内容作为标题
        await this.databaseService.db
          .update(chatMessages)
          .set({ content: title })
          .where(eq(chatMessages.id, firstMessage[0].id));
        this.logger.log(`[PgMemoryRepository] Session title updated successfully`);
      }
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to update session title: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 删除会话
   * 删除该会话的所有消息
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`[PgMemoryRepository] Deleting session - session: ${sessionId}`);
    try {
      await this.databaseService.db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.sessionId, sessionId),
          ),
        );
      this.logger.log(`[PgMemoryRepository] Session deleted successfully`);
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
