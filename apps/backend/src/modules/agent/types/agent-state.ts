export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
}

export interface Observation {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: Date;
}

export type AgentIntent =
  | 'portfolio_analysis'
  | 'news_analysis'
  | 'signal_analysis'
  | 'backtest_analysis'
  | 'report_analysis'
  | 'general_chat';

export interface AgentState {
  userInput: string;
  userId: string;
  sessionId: string;

  chatHistory: Message[];
  relevantMemories: string[];

  intent?: AgentIntent;
  plan?: string[];
  currentStep: number;

  observations: Observation[];

  finalAnswer?: string;
}

export const initialAgentState = (
  userInput: string,
  userId: string,
  sessionId: string,
): AgentState => ({
  userInput,
  userId,
  sessionId,
  chatHistory: [],
  relevantMemories: [],
  currentStep: 0,
  observations: [],
});
