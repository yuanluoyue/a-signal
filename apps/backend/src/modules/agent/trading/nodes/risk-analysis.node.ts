import { Logger } from '@nestjs/common';
import { TradingAgentState, TradingAgentRiskLevel } from '../types/trading-agent-state.js';
import { VolcengineService } from '../../../../core/volcengine/volcengine.service.js';

const logger = new Logger('riskAnalysisNode');

const RISK_ANALYSIS_PROMPT = `你是一个专业的交易风险管理分析师。请根据以下信息分析交易风险等级。

账户信息：
可用资金：{{availableCash}}
总资产：{{currentCapital}}
总盈亏：{{totalProfit}}
总收益率：{{totalReturn}}

当前持仓：
{{positions}}

交易信号：
股票代码：{{stockCode}}
股票名称：{{stockName}}
操作方向：{{action}}
信号评分：{{score}}
信号理由：{{reason}}

请分析以下风险因素并返回JSON格式：
1. riskLevel: 风险等级 (low/medium/high/critical)
2. conflictInfo: 持仓冲突信息（如同股票已有持仓、方向相反等），无冲突则为空字符串
3. concentrationInfo: 集中度风险信息（如该股票占比过高），无集中度风险则为空字符串

风险等级判断标准：
- low: 信号评分高，无持仓冲突，资金充裕，集中度低
- medium: 信号评分中等，或存在轻微集中度问题
- high: 信号评分低，或存在持仓冲突，或集中度过高
- critical: 严重冲突（如已有同股票反向持仓），或资金严重不足

只返回JSON，不要其他内容：
{"riskLevel": "low|medium|high|critical", "conflictInfo": "", "concentrationInfo": ""}`;

export async function riskAnalysisNode(
  state: TradingAgentState,
  volcengineService: VolcengineService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[riskAnalysisNode] Analyzing risk for signal: ${state.signalId}`);

  try {
    const accountInfo = state.accountInfo;
    const signalInfo = state.signalInfo;
    const currentPositions = state.currentPositions || [];

    if (!accountInfo || !signalInfo) {
      logger.warn('[riskAnalysisNode] Missing account or signal info, defaulting to high risk');
      return {
        riskLevel: 'high',
        conflictInfo: '缺少账户或信号信息',
        concentrationInfo: '',
      };
    }

    const existingPosition = currentPositions.find(
      (p) => p.stockCode === signalInfo.stockCode,
    );

    const positionsText = currentPositions.length > 0
      ? currentPositions
          .map((p) => `${p.stockCode}(${p.stockName}): 数量${p.quantity}, 成本${p.avgCost}, 市值${p.marketValue}, 盈亏${p.profit}`)
          .join('\n')
      : '无持仓';

    const prompt = RISK_ANALYSIS_PROMPT
      .replace('{{availableCash}}', String(accountInfo.availableCash))
      .replace('{{currentCapital}}', String(accountInfo.currentCapital))
      .replace('{{totalProfit}}', String(accountInfo.totalProfit))
      .replace('{{totalReturn}}', String(accountInfo.totalReturn))
      .replace('{{positions}}', positionsText)
      .replace('{{stockCode}}', signalInfo.stockCode)
      .replace('{{stockName}}', signalInfo.stockName)
      .replace('{{action}}', signalInfo.action)
      .replace('{{score}}', String(signalInfo.score))
      .replace('{{reason}}', signalInfo.reason);

    const response = await volcengineService.chatCompletion(
      [
        { role: 'system', content: '你是一个交易风险管理分析师，只返回JSON格式的风险分析结果。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.1, maxTokens: 500, responseFormat: { type: 'json_object' } },
    );

    let parsed: { riskLevel: string; conflictInfo: string; concentrationInfo: string };
    try {
      parsed = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse risk analysis response');
      }
    }

    const validLevels: TradingAgentRiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const riskLevel = validLevels.includes(parsed.riskLevel as TradingAgentRiskLevel)
      ? (parsed.riskLevel as TradingAgentRiskLevel)
      : 'medium';

    const conflictInfo = parsed.conflictInfo || (existingPosition ? `已持有${signalInfo.stockCode}(${signalInfo.stockName})` : '');
    const concentrationInfo = parsed.concentrationInfo || '';

    logger.log(`[riskAnalysisNode] Risk level: ${riskLevel}, conflict: ${conflictInfo || 'none'}, concentration: ${concentrationInfo || 'none'}`);

    return {
      riskLevel,
      conflictInfo,
      concentrationInfo,
    };
  } catch (error) {
    logger.error(`[riskAnalysisNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      riskLevel: 'high',
      conflictInfo: '风险分析失败，默认高风险',
      concentrationInfo: '',
    };
  }
}
