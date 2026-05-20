import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../../core/db/db.service.js';
import { llmRequests, llmUsageDaily, llmProviderConfigs } from '../../../core/db/schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

@Injectable()
export class LlmUsageService {
  private readonly logger = new Logger(LlmUsageService.name);
  private readonly rpmCounters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(private readonly dbService: DbService) {}

  async recordRequest(requestData: {
    module: string;
    task: string;
    provider: string;
    model: string;
    userId?: string;
    requestId?: string;
    traceId?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    retryCount: number;
    cacheHit: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.dbService.db.insert(llmRequests).values({
        module: requestData.module,
        task: requestData.task,
        provider: requestData.provider,
        model: requestData.model,
        userId: requestData.userId,
        requestId: requestData.requestId,
        traceId: requestData.traceId,
        promptTokens: requestData.promptTokens,
        completionTokens: requestData.completionTokens,
        totalTokens: requestData.totalTokens,
        estimatedCost: requestData.estimatedCost.toString(),
        latencyMs: requestData.latencyMs,
        success: requestData.success,
        errorMessage: requestData.errorMessage,
        retryCount: requestData.retryCount,
        cacheHit: requestData.cacheHit,
        metadata: requestData.metadata,
      });
    } catch (error) {
      this.logger.error(`LlmUsageService.recordRequest: failed to record request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async checkBudget(provider: string): Promise<{ allowed: boolean; usedTokens: number; budget: number | null }> {
    const config = await this.getProviderConfig(provider);
    if (!config || !config.dailyBudget) {
      return { allowed: true, usedTokens: 0, budget: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.dbService.db
      .select({ totalTokens: sql<number>`COALESCE(SUM(${llmRequests.totalTokens}), 0)` })
      .from(llmRequests)
      .where(
        and(
          eq(llmRequests.provider, provider),
          eq(llmRequests.success, true),
          gte(llmRequests.createdAt, today),
          lte(llmRequests.createdAt, tomorrow),
        ),
      );

    const usedTokens = Number(result[0]?.totalTokens ?? 0);
    const allowed = usedTokens < config.dailyBudget;

    if (!allowed) {
      this.logger.warn(`LlmUsageService.checkBudget: LLM daily budget exceeded for provider ${provider}, used=${usedTokens}, budget=${config.dailyBudget}`);
    }

    return { allowed, usedTokens, budget: config.dailyBudget };
  }

  async checkRpmLimit(provider: string): Promise<boolean> {
    const config = await this.getProviderConfig(provider);
    if (!config || !config.rpmLimit) return true;

    const now = Date.now();
    const counter = this.rpmCounters.get(provider);

    if (!counter || now > counter.resetAt) {
      this.rpmCounters.set(provider, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (counter.count >= config.rpmLimit) {
      this.logger.warn(`LlmUsageService.checkRpmLimit: LLM RPM limit exceeded for provider ${provider}, count=${counter.count}, limit=${config.rpmLimit}`);
      return false;
    }

    counter.count++;
    return true;
  }

  async getProviderConfig(provider: string): Promise<typeof llmProviderConfigs.$inferSelect | null> {
    const result = await this.dbService.db
      .select()
      .from(llmProviderConfigs)
      .where(eq(llmProviderConfigs.provider, provider))
      .limit(1);
    return result[0] ?? null;
  }

  async getAllProviderConfigs(): Promise<Array<typeof llmProviderConfigs.$inferSelect>> {
    return this.dbService.db.select().from(llmProviderConfigs).orderBy(llmProviderConfigs.provider);
  }

  async updateProviderConfig(provider: string, updates: Partial<{
    enabled: boolean;
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    rpmLimit: number;
    dailyBudget: number;
  }>): Promise<void> {
    await this.dbService.db
      .update(llmProviderConfigs)
      .set(updates)
      .where(eq(llmProviderConfigs.provider, provider));
  }

  async createProviderConfig(data: {
    provider: string;
    enabled?: boolean;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    rpmLimit?: number;
    dailyBudget?: number;
  }): Promise<typeof llmProviderConfigs.$inferSelect> {
    const [result] = await this.dbService.db
      .insert(llmProviderConfigs)
      .values(data)
      .returning();
    return result;
  }

  async getEnabledProviders(): Promise<string[]> {
    const configs = await this.dbService.db
      .select()
      .from(llmProviderConfigs)
      .where(eq(llmProviderConfigs.enabled, true));
    return configs.map((c) => c.provider).filter((p): p is string => p !== null);
  }

  async aggregateDailyUsage(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const aggregation = await this.dbService.db
      .select({
        module: llmRequests.module,
        provider: llmRequests.provider,
        totalRequests: sql<number>`COUNT(*)::int`,
        totalTokens: sql<number>`COALESCE(SUM(${llmRequests.totalTokens}), 0)::int`,
        totalCost: sql<string>`COALESCE(SUM(${llmRequests.estimatedCost}), 0)`,
      })
      .from(llmRequests)
      .where(
        and(
          gte(llmRequests.createdAt, today),
          lte(llmRequests.createdAt, tomorrow),
        ),
      )
      .groupBy(llmRequests.module, llmRequests.provider);

    for (const row of aggregation) {
      if (!row.module || !row.provider) continue;

      const existing = await this.dbService.db
        .select()
        .from(llmUsageDaily)
        .where(
          and(
            eq(llmUsageDaily.date, today),
            eq(llmUsageDaily.module, row.module),
            eq(llmUsageDaily.provider, row.provider),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await this.dbService.db
          .update(llmUsageDaily)
          .set({
            totalRequests: row.totalRequests,
            totalTokens: row.totalTokens,
            totalCost: row.totalCost,
          })
          .where(eq(llmUsageDaily.id, existing[0].id));
      } else {
        await this.dbService.db.insert(llmUsageDaily).values({
          date: today,
          module: row.module,
          provider: row.provider,
          totalRequests: row.totalRequests,
          totalTokens: row.totalTokens,
          totalCost: row.totalCost,
        });
      }
    }
  }

  async getTodayStats(): Promise<{
    totalTokens: number;
    totalRequests: number;
    totalErrors: number;
    totalCost: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.dbService.db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${llmRequests.totalTokens}), 0)::int`,
        totalRequests: sql<number>`COUNT(*)::int`,
        totalErrors: sql<number>`COUNT(CASE WHEN ${llmRequests.success} = false THEN 1 END)::int`,
        totalCost: sql<string>`COALESCE(SUM(${llmRequests.estimatedCost}), 0)`,
      })
      .from(llmRequests)
      .where(
        and(
          gte(llmRequests.createdAt, today),
          lte(llmRequests.createdAt, tomorrow),
        ),
      );

    const row = result[0];
    return {
      totalTokens: Number(row?.totalTokens ?? 0),
      totalRequests: Number(row?.totalRequests ?? 0),
      totalErrors: Number(row?.totalErrors ?? 0),
      totalCost: Number(row?.totalCost ?? 0),
    };
  }

  async getModuleUsage(startDate: Date, endDate: Date): Promise<Array<{
    module: string;
    totalTokens: number;
    totalRequests: number;
    totalCost: number;
  }>> {
    const result = await this.dbService.db
      .select({
        module: llmRequests.module,
        totalTokens: sql<number>`COALESCE(SUM(${llmRequests.totalTokens}), 0)::int`,
        totalRequests: sql<number>`COUNT(*)::int`,
        totalCost: sql<string>`COALESCE(SUM(${llmRequests.estimatedCost}), 0)`,
      })
      .from(llmRequests)
      .where(
        and(
          gte(llmRequests.createdAt, startDate),
          lte(llmRequests.createdAt, endDate),
        ),
      )
      .groupBy(llmRequests.module);

    return result.map((r) => ({
      module: r.module ?? 'unknown',
      totalTokens: Number(r.totalTokens),
      totalRequests: Number(r.totalRequests),
      totalCost: Number(r.totalCost),
    }));
  }

  async getProviderUsage(startDate: Date, endDate: Date): Promise<Array<{
    provider: string;
    model: string;
    totalTokens: number;
    totalRequests: number;
    totalCost: number;
  }>> {
    const result = await this.dbService.db
      .select({
        provider: llmRequests.provider,
        model: llmRequests.model,
        totalTokens: sql<number>`COALESCE(SUM(${llmRequests.totalTokens}), 0)::int`,
        totalRequests: sql<number>`COUNT(*)::int`,
        totalCost: sql<string>`COALESCE(SUM(${llmRequests.estimatedCost}), 0)`,
      })
      .from(llmRequests)
      .where(
        and(
          gte(llmRequests.createdAt, startDate),
          lte(llmRequests.createdAt, endDate),
        ),
      )
      .groupBy(llmRequests.provider, llmRequests.model);

    return result.map((r) => ({
      provider: r.provider ?? 'unknown',
      model: r.model ?? 'unknown',
      totalTokens: Number(r.totalTokens),
      totalRequests: Number(r.totalRequests),
      totalCost: Number(r.totalCost),
    }));
  }

  async getLatencyStats(startDate: Date, endDate: Date): Promise<{
    avgLatencyMs: number;
    retryRate: number;
    timeoutRate: number;
  }> {
    const result = await this.dbService.db
      .select({
        avgLatencyMs: sql<number>`COALESCE(AVG(${llmRequests.latencyMs}), 0)::int`,
        retryRate: sql<number>`COALESCE(COUNT(CASE WHEN ${llmRequests.retryCount} > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0), 0)`,
        timeoutRate: sql<number>`COALESCE(COUNT(CASE WHEN ${llmRequests.errorMessage} ILIKE '%timeout%' THEN 1 END)::float / NULLIF(COUNT(*), 0), 0)`,
      })
      .from(llmRequests)
      .where(
        and(
          gte(llmRequests.createdAt, startDate),
          lte(llmRequests.createdAt, endDate),
        ),
      );

    const row = result[0];
    return {
      avgLatencyMs: Number(row?.avgLatencyMs ?? 0),
      retryRate: Number(row?.retryRate ?? 0),
      timeoutRate: Number(row?.timeoutRate ?? 0),
    };
  }

  async getLogList(query: {
    page?: number;
    pageSize?: number;
    module?: string;
    task?: string;
    provider?: string;
    model?: string;
    success?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Array<typeof llmRequests.$inferSelect>; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (query.module) conditions.push(eq(llmRequests.module, query.module));
    if (query.task) conditions.push(eq(llmRequests.task, query.task));
    if (query.provider) conditions.push(eq(llmRequests.provider, query.provider));
    if (query.model) conditions.push(eq(llmRequests.model, query.model));
    if (query.success !== undefined && query.success !== '') conditions.push(eq(llmRequests.success, query.success === 'true'));
    if (query.startDate) conditions.push(gte(llmRequests.createdAt, new Date(query.startDate)));
    if (query.endDate) conditions.push(lte(llmRequests.createdAt, new Date(query.endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.dbService.db
        .select()
        .from(llmRequests)
        .where(whereClause)
        .orderBy(desc(llmRequests.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.dbService.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(llmRequests)
        .where(whereClause),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  }

  async getLogDetail(id: string): Promise<typeof llmRequests.$inferSelect | null> {
    const result = await this.dbService.db
      .select()
      .from(llmRequests)
      .where(eq(llmRequests.id, id))
      .limit(1);
    return result[0] ?? null;
  }
}
