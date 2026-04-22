import { Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { events, NewEvent, Event } from '../../core/db/schema.js';

type SubjectType = 'stock' | 'sector' | 'index' | 'commodity';

export interface CreateEventDto {
  newsId?: string;
  occurredAt: Date;
  category: string;
  subcategory: string;
  subjects: Array<{ type: SubjectType; code: string; weight: number }>;
  sentimentDirection: number;
  sentimentConfidence: number;
  sentimentRationale: string;
  importanceScore: number;
  importanceBenchmark?: string | null;
  surpriseScore?: number | null;
  surpriseBaseline?: string | null;
  effectivePeriodStart: Date;
  effectivePeriodEnd?: Date;
  effectiveDecayType: string;
  metrics?: Array<{ name: string; value: number; unit: string; yoyChange?: number | null }> | null;
  sourceUrl?: string;
  sourceTitle: string;
  sourceSummary: string;
  sourcePublisher: string;
  version?: number;
}

export interface EventsListQueryDto {
  page?: number;
  pageSize?: number;
  category?: string;
  subcategory?: string;
  sentimentDirection?: number;
  processed?: boolean;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly dbService: DbService) {}

  async createEvent(dto: CreateEventDto): Promise<Event> {
    try {
      const newEvent: NewEvent = {
        newsId: dto.newsId || null,
        occurredAt: dto.occurredAt,
        category: dto.category,
        subcategory: dto.subcategory,
        subjects: dto.subjects as Array<{ type: 'stock' | 'sector' | 'index' | 'commodity'; code: string; weight: number }>,
        sentimentDirection: dto.sentimentDirection,
        sentimentConfidence: String(dto.sentimentConfidence),
        sentimentRationale: dto.sentimentRationale,
        importanceScore: String(dto.importanceScore),
        importanceBenchmark: dto.importanceBenchmark || null,
        surpriseScore: dto.surpriseScore != null ? String(dto.surpriseScore) : null,
        surpriseBaseline: dto.surpriseBaseline || null,
        effectivePeriodStart: dto.effectivePeriodStart,
        effectivePeriodEnd: dto.effectivePeriodEnd || null,
        effectiveDecayType: dto.effectiveDecayType,
        metrics: dto.metrics || null,
        sourceUrl: dto.sourceUrl || null,
        sourceTitle: dto.sourceTitle,
        sourceSummary: dto.sourceSummary,
        sourcePublisher: dto.sourcePublisher,
        version: dto.version || 1,
        processed: false,
      };

      const [result] = await this.dbService.db
        .insert(events)
        .values(newEvent)
        .returning();

      this.logger.log(`Created event ${result.id} [${dto.category}/${dto.subcategory}]`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create event: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async createEventsBatch(dtos: CreateEventDto[]): Promise<Event[]> {
    if (dtos.length === 0) {
      return [];
    }

    try {
      const newEvents: NewEvent[] = dtos.map((dto) => ({
        newsId: dto.newsId || null,
        occurredAt: dto.occurredAt,
        category: dto.category,
        subcategory: dto.subcategory,
        subjects: dto.subjects as Array<{ type: 'stock' | 'sector' | 'index' | 'commodity'; code: string; weight: number }>,
        sentimentDirection: dto.sentimentDirection,
        sentimentConfidence: String(dto.sentimentConfidence),
        sentimentRationale: dto.sentimentRationale,
        importanceScore: String(dto.importanceScore),
        importanceBenchmark: dto.importanceBenchmark || null,
        surpriseScore: dto.surpriseScore != null ? String(dto.surpriseScore) : null,
        surpriseBaseline: dto.surpriseBaseline || null,
        effectivePeriodStart: dto.effectivePeriodStart,
        effectivePeriodEnd: dto.effectivePeriodEnd || null,
        effectiveDecayType: dto.effectiveDecayType,
        metrics: dto.metrics || null,
        sourceUrl: dto.sourceUrl || null,
        sourceTitle: dto.sourceTitle,
        sourceSummary: dto.sourceSummary,
        sourcePublisher: dto.sourcePublisher,
        version: dto.version || 1,
        processed: false,
      }));

      const results = await this.dbService.db
        .insert(events)
        .values(newEvents)
        .returning();

      this.logger.log(`Created ${results.length} events in batch`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to create events batch: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<Event | null> {
    try {
      const [result] = await this.dbService.db
        .select()
        .from(events)
        .where(eq(events.id, id));

      return result || null;
    } catch (error) {
      this.logger.error(
        `Failed to find event by id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByNewsId(newsId: string): Promise<Event[]> {
    try {
      const results = await this.dbService.db
        .select()
        .from(events)
        .where(eq(events.newsId, newsId));

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to find events by newsId ${newsId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findList(query: EventsListQueryDto): Promise<{ data: Event[]; total: number; page: number; pageSize: number }> {
    try {
      const { page = 1, pageSize = 10, category, subcategory, sentimentDirection, processed, startTime, endTime } = query;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq | typeof gte | typeof lte>[] = [];

      if (category) {
        conditions.push(eq(events.category, category));
      }
      if (subcategory) {
        conditions.push(eq(events.subcategory, subcategory));
      }
      if (sentimentDirection !== undefined) {
        conditions.push(eq(events.sentimentDirection, sentimentDirection));
      }
      if (processed !== undefined) {
        conditions.push(eq(events.processed, processed));
      }
      if (startTime) {
        conditions.push(gte(events.occurredAt, new Date(startTime)));
      }
      if (endTime) {
        conditions.push(lte(events.occurredAt, new Date(endTime)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await this.dbService.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(events)
        .where(whereClause || sql`1=1`);
      const total = Number(countResult[0]?.count || 0);

      const data = await this.dbService.db
        .select()
        .from(events)
        .where(whereClause || sql`1=1`)
        .orderBy(desc(events.occurredAt))
        .limit(pageSize)
        .offset(offset);

      return {
        data,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get events list: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findUnprocessed(limit: number = 100): Promise<Event[]> {
    try {
      const results = await this.dbService.db
        .select()
        .from(events)
        .where(eq(events.processed, false))
        .orderBy(events.occurredAt)
        .limit(limit);

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to find unprocessed events: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async updateProcessed(id: string, processed: boolean): Promise<void> {
    try {
      await this.dbService.db
        .update(events)
        .set({ processed })
        .where(eq(events.id, id));

      this.logger.log(`Updated event ${id} processed to ${processed}`);
    } catch (error) {
      this.logger.error(
        `Failed to update event ${id} processed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
