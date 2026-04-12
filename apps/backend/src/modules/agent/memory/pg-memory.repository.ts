import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DbService } from '../../../core/db/db.service.js';
import {
  chatMessages,
  type ChatMessage,
  type NewChatMessage,
} from '../../../core/db/schema.js';

@Injectable()
export class PgMemoryRepository {
  private readonly logger = new Logger(PgMemoryRepository.name);

  constructor(private readonly dbService: DbService) {}

  async getRecentMessages(
    userId: string,
    sessionId: string,
    limit: number = 15,
  ): Promise<ChatMessage[]> {
    this.logger.log(`[PgMemoryRepository] Querying messages for user: ${userId}, session: ${sessionId}`);
    try {
      const messages = await this.dbService.db
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
      return messages.reverse();
    } catch (error) {
      this.logger.error(
        `[PgMemoryRepository] Failed to get recent messages: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async saveMessage(message: NewChatMessage): Promise<ChatMessage | null> {
    try {
      const [saved] = await this.dbService.db
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

  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const result = await this.dbService.db
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

  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
    this.logger.log(`[PgMemoryRepository] Updating session title - session: ${sessionId}`);
    try {
      const firstMessage = await this.dbService.db
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
        await this.dbService.db
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

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`[PgMemoryRepository] Deleting session - session: ${sessionId}`);
    try {
      await this.dbService.db
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
