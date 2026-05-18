import { Logger } from '@nestjs/common';
import {
  TradingAgentState,
  TradingAgentDecision,
  TradingAgentDecisionType,
  PositionAction,
} from '../types/trading-agent-state.js';
import { VolcengineService } from '../../../../core/volcengine/volcengine.service.js';

const logger = new Logger('decisionNode');

const DECISION_PROMPT = `你是一个专业的交易决策Agent。请根据以下信息做出交易决策。

账户信息：
可用资金：{{availableCash}}
总资产：{{currentCapital}}

交易信号：
股票代码：{{stockCode}}
股票名称：{{stockName}}
操作方向：{{action}}
信号评分：{{score}}
信号理由：{{reason}}

触发策略：
{{strategyInfo}}

风险分析：
风险等级：{{riskLevel}}
冲突信息：{{conflictInfo}}
集中度信息：{{concentrationInfo}}

当前持仓：
{{positions}}

相关交易经验：
{{memories}}

请综合考虑信号质量、策略参数、风险等级、交易经验和当前持仓，做出交易决策。

返回JSON格式：
{
  "decision": "approved|rejected",
  "decisionType": "execute|reject|adjust_position|close_position|modify_holding",
  "rationale": "决策理由",
  "confidence": 0.0-1.0,
  "positionAction": {
    "action": "buy|sell",
    "stockCode": "股票代码",
    "stockName": "股票名称",
    "quantity": 数量,
    "takeProfitPrice": 止盈价或null,
    "stopLossPrice": 止损价或null
  }
}

决策规则：
1. 如果风险等级为high或critical，必须reject
2. 信号评分低于0.3时，倾向reject
3. 如果已有同股票持仓，可考虑adjust_position
4. 如果资金不足，reject
5. quantity必须为100的整数倍（A股最小交易单位）
6. 买入金额不应超过可用资金的30%
7. 如果approved，positionAction必须提供
8. 如果rejected，positionAction为null
9. 策略的止盈止损参数可作为参考，但Agent可根据风险判断调整`;

export async function decisionNode(
  state: TradingAgentState,
  volcengineService: VolcengineService,
): Promise<Partial<TradingAgentState>> {
  logger.log(`[decisionNode] Making decision for signal: ${state.signalId}, riskLevel: ${state.riskLevel}`);

  try {
    if (state.riskLevel === 'high' || state.riskLevel === 'critical') {
      logger.log(`[decisionNode] Auto-rejecting due to high risk level: ${state.riskLevel}`);
      return {
        decision: 'rejected',
        decisionType: 'reject',
        rationale: `风险等级为${state.riskLevel}，自动拒绝。${state.conflictInfo ? '冲突信息：' + state.conflictInfo : ''}${state.concentrationInfo ? '集中度风险：' + state.concentrationInfo : ''}`,
        confidence: 0.9,
      };
    }

    const accountInfo = state.accountInfo;
    const signalInfo = state.signalInfo;
    const currentPositions = state.currentPositions || [];
    const relevantMemories = state.relevantMemories || [];

    if (!accountInfo || !signalInfo) {
      logger.warn('[decisionNode] Missing account or signal info, rejecting');
      return {
        decision: 'rejected',
        decisionType: 'reject',
        rationale: '缺少账户或信号信息，无法做出决策',
        confidence: 0.5,
      };
    }

    const positionsText = currentPositions.length > 0
      ? currentPositions
          .map((p) => `${p.stockCode}(${p.stockName}): 数量${p.quantity}, 市值${p.marketValue}`)
          .join('\n')
      : '无持仓';

    const memoriesText = relevantMemories.length > 0
      ? relevantMemories
          .map((m) => `[${m.type}] ${m.title}: ${m.summary} (置信度: ${m.confidence})`)
          .join('\n')
      : '无相关交易经验';

    const strategyText = state.strategyInfo
      ? `策略名称：${state.strategyInfo.name}\n方向模式：${state.strategyInfo.directionMode}\n最低分数：${state.strategyInfo.minScore}\n持有周期：${state.strategyInfo.holdPeriod}天\n止损比例：${state.strategyInfo.stopLossPct ?? '未设置'}%\n止盈比例：${state.strategyInfo.takeProfitPct ?? '未设置'}%`
      : '无策略信息（直接触发）';

    const prompt = DECISION_PROMPT
      .replace('{{availableCash}}', String(accountInfo.availableCash))
      .replace('{{currentCapital}}', String(accountInfo.currentCapital))
      .replace('{{stockCode}}', signalInfo.stockCode)
      .replace('{{stockName}}', signalInfo.stockName)
      .replace('{{action}}', signalInfo.action)
      .replace('{{score}}', String(signalInfo.score))
      .replace('{{reason}}', signalInfo.reason)
      .replace('{{strategyInfo}}', strategyText)
      .replace('{{riskLevel}}', state.riskLevel || 'medium')
      .replace('{{conflictInfo}}', state.conflictInfo || '无')
      .replace('{{concentrationInfo}}', state.concentrationInfo || '无')
      .replace('{{positions}}', positionsText)
      .replace('{{memories}}', memoriesText);

    const response = await volcengineService.chatCompletion(
      [
        { role: 'system', content: '你是一个交易决策Agent，只返回JSON格式的决策结果。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 800, responseFormat: { type: 'json_object' } },
    );

    let parsed: {
      decision: string;
      decisionType: string;
      rationale: string;
      confidence: number;
      positionAction: PositionAction | null;
    };
    try {
      parsed = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse decision response');
      }
    }

    const validDecisions: TradingAgentDecision[] = ['approved', 'rejected'];
    const validDecisionTypes: TradingAgentDecisionType[] = ['execute', 'reject', 'adjust_position', 'close_position', 'modify_holding'];

    const decision = validDecisions.includes(parsed.decision as TradingAgentDecision)
      ? (parsed.decision as TradingAgentDecision)
      : 'rejected';

    const decisionType = validDecisionTypes.includes(parsed.decisionType as TradingAgentDecisionType)
      ? (parsed.decisionType as TradingAgentDecisionType)
      : 'reject';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    const positionAction = decision === 'approved' && parsed.positionAction
      ? parsed.positionAction
      : undefined;

    logger.log(`[decisionNode] Decision: ${decision}, type: ${decisionType}, confidence: ${confidence}`);

    return {
      decision,
      decisionType,
      rationale: parsed.rationale || '',
      confidence,
      positionAction,
    };
  } catch (error) {
    logger.error(`[decisionNode] Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      decision: 'rejected',
      decisionType: 'reject',
      rationale: `决策过程出错: ${error instanceof Error ? error.message : String(error)}`,
      confidence: 0.1,
    };
  }
}
