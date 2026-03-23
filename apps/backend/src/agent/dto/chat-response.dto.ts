export interface ChatResponseDto {
  message: string;
  sessionId: string;
}

export interface ChatHistoryItemDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface SseEventDto {
  event: 'thinking' | 'tool' | 'answer' | 'done' | 'error';
  data: unknown;
}
