import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Sse,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResearchAgentService } from './research-agent.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import type { SseEventDto } from './dto/chat-response.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly researchAgentService: ResearchAgentService) {}

  /**
   * 流式聊天接口 (SSE)
   */
  @Public()
  @Post('chat')
  @Sse()
  async chat(@Body() dto: ChatRequestDto): Promise<Observable<string>> {
    const stream = this.researchAgentService.chat(dto);

    const events = await this.streamToObservable(stream);
    return from(events).pipe(
      map((event: SseEventDto) => `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`),
    );
  }

  /**
   * 非流式聊天接口
   */
  @Public()
  @Post('chat/sync')
  @HttpCode(HttpStatus.OK)
  async chatSync(@Body() dto: ChatRequestDto) {
    return this.researchAgentService.chatSync(dto);
  }

  /**
   * 流式聊天接口 (HTTP Response)
   * 用于更好的 SSE 控制
   */
  @Public()
  @Post('chat/stream')
  async chatStream(@Body() dto: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = this.researchAgentService.chat(dto);

      for await (const event of stream) {
        const sseEvent: SseEventDto = {
          event: event.type,
          data: event.data,
        };
        res.write(`event: ${sseEvent.event}\ndata: ${JSON.stringify(sseEvent.data)}\n\n`);
      }

      res.end();
    } catch (error) {
      const errorEvent: SseEventDto = {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' },
      };
      res.write(`event: ${errorEvent.event}\ndata: ${JSON.stringify(errorEvent.data)}\n\n`);
      res.end();
    }
  }

  /**
   * 获取聊天历史
   */
  @Public()
  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('sessionId') sessionId: string,
  ) {
    this.logger.log(`[AgentController] Get history - userId: ${userId}, sessionId: ${sessionId}`);
    const result = await this.researchAgentService.getChatHistory(userId, sessionId);
    this.logger.log(`[AgentController] Returning ${result.length} messages`);
    return result;
  }

  /**
   * 获取用户的所有会话
   */
  @Public()
  @Get('sessions')
  async getSessions(@Query('userId') userId: string) {
    this.logger.log(`[AgentController] Get sessions - userId: ${userId}`);
    const sessions = await this.researchAgentService.getUserSessions(userId);
    this.logger.log(`[AgentController] Returning ${sessions.length} sessions`);
    return { sessions };
  }

  /**
   * 更新会话标题
   */
  @Public()
  @Put('session/title')
  @HttpCode(HttpStatus.OK)
  async updateSessionTitle(
    @Body() dto: { userId: string; sessionId: string; title: string },
  ) {
    this.logger.log(`[AgentController] Update session title - sessionId: ${dto.sessionId}, title: ${dto.title}`);
    await this.researchAgentService.updateSessionTitle(dto.userId, dto.sessionId, dto.title);
    return { success: true, message: '标题更新成功' };
  }

  /**
   * 删除会话
   */
  @Public()
  @Delete('session')
  @HttpCode(HttpStatus.OK)
  async deleteSession(
    @Query('userId') userId: string,
    @Query('sessionId') sessionId: string,
  ) {
    this.logger.log(`[AgentController] Delete session - userId: ${userId}, sessionId: ${sessionId}`);
    await this.researchAgentService.deleteSession(userId, sessionId);
    return { success: true, message: '会话删除成功' };
  }

  private async streamToObservable(
    stream: AsyncGenerator<{ type: string; data: unknown }>,
  ): Promise<SseEventDto[]> {
    const events: SseEventDto[] = [];
    for await (const event of stream) {
      events.push({
        event: event.type as 'thinking' | 'tool' | 'answer' | 'done' | 'error',
        data: event.data,
      });
    }
    return events;
  }
}
