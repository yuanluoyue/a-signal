import { Injectable, Logger } from '@nestjs/common';
import { AgentState, initialAgentState } from '../types/agent-state.js';
import { MemoryService } from '../memory/memory.service.js';
import { VolcengineService } from '../../../core/volcengine/volcengine.service.js';
import { ToolRegistryService } from '../tools/index.js';
import {
  memoryLoadNode,
  intentNode,
  plannerNode,
  toolNode,
  aggregatorNode,
  finalNode,
  memorySaveNode,
} from '../nodes/index.js';

export interface GraphExecutionResult {
  state: AgentState;
  events: GraphEvent[];
}

export interface GraphEvent {
  type: 'thinking' | 'tool' | 'answer' | 'done';
  data: unknown;
}

@Injectable()
export class AgentGraph {
  private readonly logger = new Logger(AgentGraph.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly volcengineService: VolcengineService,
    private readonly toolRegistryService: ToolRegistryService,
  ) {}

  async execute(
    userId: string,
    sessionId: string,
    userInput: string,
  ): Promise<GraphExecutionResult> {
    this.logger.debug(`[AgentGraph] Starting execution for user: ${userId}`);

    let state: AgentState = initialAgentState(userInput, userId, sessionId);
    const events: GraphEvent[] = [];

    try {
      this.logger.debug('[Graph] Executing memoryLoad node');
      const memoryResult = await memoryLoadNode(state, this.memoryService);
      state = { ...state, ...memoryResult };
      events.push({ type: 'thinking', data: { node: 'memoryLoad', message: '记忆加载完成' } });

      this.logger.debug('[Graph] Executing intent node');
      const intentResult = await intentNode(state, this.volcengineService);
      state = { ...state, ...intentResult };
      events.push({ type: 'thinking', data: { node: 'intent', intent: state.intent } });

      this.logger.debug('[Graph] Executing planner node');
      const plannerResult = await plannerNode(state, this.volcengineService, this.toolRegistryService);
      state = { ...state, ...plannerResult };
      events.push({ type: 'thinking', data: { node: 'planner', plan: state.plan } });

      const plan = state.plan || [];
      if (plan.length > 0) {
        for (let i = 0; i < plan.length; i++) {
          const toolName = plan[i];
          this.logger.debug(`[Graph] Executing tool node: ${toolName}`);
          events.push({
            type: 'tool',
            data: {
              tool: toolName,
              step: i + 1,
              total: plan.length,
            },
          });

          const toolResult = await toolNode(state, this.toolRegistryService, this.memoryService);
          state = { ...state, ...toolResult };

          const lastObservation = state.observations[state.observations.length - 1];
          if (lastObservation) {
            events.push({
              type: 'tool',
              data: {
                tool: lastObservation.toolName,
                output: lastObservation.output,
              },
            });
          }
        }
      }

      this.logger.debug('[Graph] Executing aggregator node');
      const aggregatorResult = await aggregatorNode(state);
      state = { ...state, ...aggregatorResult };
      events.push({ type: 'thinking', data: { node: 'aggregator', message: '数据整合完成' } });

      this.logger.debug('[Graph] Executing final node');
      const finalResult = await finalNode(state, this.volcengineService);
      state = { ...state, ...finalResult };

      this.logger.debug('[Graph] Executing memorySave node');
      await memorySaveNode(state, this.memoryService);

      events.push({ type: 'done', data: {} });

      this.logger.debug(`[AgentGraph] Execution completed`);

      return { state, events };
    } catch (error) {
      this.logger.error(
        `[AgentGraph] Execution error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async *stream(
    userId: string,
    sessionId: string,
    userInput: string,
  ): AsyncGenerator<GraphEvent> {
    this.logger.debug(`[AgentGraph] Starting stream for user: ${userId}`);

    let state: AgentState = initialAgentState(userInput, userId, sessionId);

    try {
      yield { type: 'thinking', data: { node: 'memoryLoad', message: '加载记忆中...' } };
      const memoryResult = await memoryLoadNode(state, this.memoryService);
      state = { ...state, ...memoryResult };

      yield { type: 'thinking', data: { node: 'intent', message: '分析意图中...' } };
      const intentResult = await intentNode(state, this.volcengineService);
      state = { ...state, ...intentResult };
      yield { type: 'thinking', data: { node: 'intent', intent: state.intent } };

      yield { type: 'thinking', data: { node: 'planner', message: '制定计划中...' } };
      const plannerResult = await plannerNode(state, this.volcengineService, this.toolRegistryService);
      state = { ...state, ...plannerResult };
      yield { type: 'thinking', data: { node: 'planner', plan: state.plan } };

      const streamPlan = state.plan || [];
      if (streamPlan.length > 0) {
        for (let i = 0; i < streamPlan.length; i++) {
          const toolName = streamPlan[i];
          yield {
            type: 'tool',
            data: {
              tool: toolName,
              step: i + 1,
              total: streamPlan.length,
            },
          };

          const toolResult = await toolNode(state, this.toolRegistryService, this.memoryService);
          state = { ...state, ...toolResult };

          const lastObservation = state.observations[state.observations.length - 1];
          if (lastObservation) {
            yield {
              type: 'tool',
              data: {
                tool: lastObservation.toolName,
                output: lastObservation.output,
              },
            };
          }
        }
      }

      yield { type: 'thinking', data: { node: 'aggregator', message: '整合数据中...' } };
      const aggregatorResult = await aggregatorNode(state);
      state = { ...state, ...aggregatorResult };

      yield { type: 'thinking', data: { node: 'final', message: '生成回答中...' } };
      const finalResult = await finalNode(state, this.volcengineService);
      state = { ...state, ...finalResult };

      if (state.finalAnswer) {
        const chars = state.finalAnswer.split('');
        for (const char of chars) {
          yield { type: 'answer', data: { chunk: char } };
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      yield { type: 'thinking', data: { node: 'memorySave', message: '保存对话...' } };
      await memorySaveNode(state, this.memoryService);

      yield { type: 'done', data: {} };
    } catch (error) {
      this.logger.error(
        `[AgentGraph] Stream error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
