import { Logger } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { TradingAgentState } from '../types/trading-agent-state.js';
import { LlmService } from '../../../llm/gateway/llm.service.js';
import { TradingMemoryService } from '../../../trading-memory/trading-memory.service.js';
import { TradingMemoryLogService } from '../../../trading-memory/trading-memory-log.service.js';
import { DbService } from '../../../../core/db/db.service.js';
import { tradingMemories } from '../../../../core/db/schema.js';

const logger = new Logger('memoryReviewNode');

const MEMORY_REVIEW_PROMPT = `你是一个交易经验总结分析师。请根据以下交易信息判断是否需要创建交易经验。

交易决策：
股票代码：{{stockCode}}
股票名称：{{stockName}}
操作：{{action}}
决策类型：{{decisionType}}
决策理由：{{rationale}}
风险等级：{{riskLevel}}
置信度：{{confidence}}

执行结果：{{executionResult}}

相关交易经验：
{{existingMemories}}

请判断这次交易是否值得记录为交易经验。值得记录的情况：
1. 首次交易某类股票
2. 特殊的市场环境下的决策
3. 与已有经验不同的新发现
4. 风险管理的重要案例

如果值得记录，返回JSON：
{
  "shouldCreate": true,
  "type": "signal_pattern|event_pattern|risk_pattern|strategy_pattern|market_regime_pattern",
  "title": "经验标题",
  "summary": "经验总结",
  "confidence": 0.0-1.0
}

如果不值得记录，返回：
{"shouldCreate": false}`;

export async function memoryReviewNode(
  state: TradingAgentState,
  llmService: LlmService,
  tradingMemoryService: TradingMemoryService,
  memoryLogService: TradingMemoryLogService,
  dbService: DbService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[memoryReviewNode] Reviewing memory for signal: ${state.signalId}`);

  try {
    if (!state.executionResult?.success || state.decision !== 'approved') {
      logger.log(`[memoryReviewNode] No trade executed or not approved, skipping memory review`);
      return { memoryCreated: false };
    }

    const signalInfo = state.signalInfo;
    const relevantMemories = state.relevantMemories || [];

    if (!signalInfo) {
      logger.warn('[memoryReviewNode] No signal info, skipping memory review');
      return { memoryCreated: false };
    }

    const existingMemoriesText = relevantMemories.length > 0
      ? relevantMemories.map((m) => `[${m.type}] ${m.title}: ${m.summary}`).join('\n')
      : '无';

    const prompt = MEMORY_REVIEW_PROMPT
      .replace('{{stockCode}}', signalInfo.stockCode)
      .replace('{{stockName}}', signalInfo.stockName)
      .replace('{{action}}', state.positionAction?.action || '')
      .replace('{{decisionType}}', state.decisionType || '')
      .replace('{{rationale}}', state.rationale || '')
      .replace('{{riskLevel}}', state.riskLevel || '')
      .replace('{{confidence}}', String(state.confidence || 0))
      .replace('{{executionResult}}', state.executionResult?.success ? '成功' : `失败: ${state.executionResult?.error || ''}`)
      .replace('{{existingMemories}}', existingMemoriesText);

    const response = await llmService.chatCompletion({
      module: 'agent-trading',
      task: 'memory-review',
      messages: [
        { role: 'system', content: '你是一个交易经验总结分析师，只返回JSON格式的分析结果。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 500,
      responseFormat: { type: 'json_object' },
    });

    let parsed: { shouldCreate: boolean; type?: string; title?: string; summary?: string; confidence?: number };
    try {
      parsed = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        logger.warn('[memoryReviewNode] Failed to parse memory review response');
        return { memoryCreated: false };
      }
    }

    if (!parsed.shouldCreate) {
      logger.log('[memoryReviewNode] No memory needs to be created');
    } else {
      const newMemoryData = {
        type: parsed.type || 'signal_pattern',
        title: parsed.title || `交易经验: ${signalInfo.stockCode}`,
        summary: parsed.summary || '',
        confidence: String(parsed.confidence || 0.5),
        status: 'testing',
        pattern: {
          signalDirection: (state.positionAction?.action === 'buy' ? 'long' : state.positionAction?.action === 'sell' ? 'short' : undefined) as 'long' | 'short' | undefined,
          scoreRange: signalInfo.score ? [Math.floor(signalInfo.score * 10) / 10, Math.ceil(signalInfo.score * 10) / 10] as [number, number] : undefined,
        },
        firstObservedAt: new Date(),
        lastValidatedAt: new Date(),
      };

      await dbService.db.insert(tradingMemories).values({
        type: newMemoryData.type,
        title: newMemoryData.title,
        summary: newMemoryData.summary,
        confidence: newMemoryData.confidence,
        status: newMemoryData.status,
        pattern: newMemoryData.pattern,
        firstObservedAt: newMemoryData.firstObservedAt,
        lastValidatedAt: newMemoryData.lastValidatedAt,
      });

      logger.log(`[memoryReviewNode] Created trading memory: ${newMemoryData.title}`);

      try {
        const [createdMemory] = await dbService.db
          .select({ id: tradingMemories.id })
          .from(tradingMemories)
          .orderBy(desc(tradingMemories.createdAt))
          .limit(1);

        if (createdMemory) {
          await memoryLogService.createLog({
            memoryId: createdMemory.id,
            action: 'create',
            newValue: {
              type: newMemoryData.type,
              title: newMemoryData.title,
              confidence: newMemoryData.confidence,
              status: newMemoryData.status,
            },
            operator: 'system',
            detail: `Agent自动创建交易经验: ${newMemoryData.title}, 股票=${signalInfo.stockCode}`,
          });
        }
      } catch (logError) {
        logger.error(`[memoryReviewNode] Failed to log memory creation: ${logError instanceof Error ? logError.message : String(logError)}`);
      }
    }

    try {
      logger.log('[memoryReviewNode] Calibrating existing memories after trade completion');
      const calibrationResults = await tradingMemoryService.calibrateAllMemories();
      if (calibrationResults.length > 0) {
        logger.log(`[memoryReviewNode] Calibrated ${calibrationResults.length} memories`);
        for (const result of calibrationResults) {
          if (result.oldStatus !== result.newStatus) {
            logger.log(`[memoryReviewNode] Memory "${result.title}" status changed: ${result.oldStatus} → ${result.newStatus}`);
          }
          if (Math.abs(result.oldConfidence - result.newConfidence) > 0.001) {
            logger.log(`[memoryReviewNode] Memory "${result.title}" confidence adjusted: ${result.oldConfidence} → ${result.newConfidence}`);
          }
        }
      }
    } catch (calibrationError) {
      logger.error(`[memoryReviewNode] Calibration failed (non-blocking): ${calibrationError instanceof Error ? calibrationError.message : String(calibrationError)}`);
    }

    return {
      memoryCreated: parsed.shouldCreate || false,
      newMemoryData: parsed.shouldCreate ? {
        type: parsed.type || 'signal_pattern',
        title: parsed.title || `交易经验: ${signalInfo.stockCode}`,
        summary: parsed.summary || '',
        confidence: parsed.confidence || 0.5,
      } : undefined,
    };
  } catch (error) {
    logger.error(`[memoryReviewNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return { memoryCreated: false };
  }
}
