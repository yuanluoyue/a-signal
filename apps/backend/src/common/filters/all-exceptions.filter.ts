import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? (exception as HttpException).getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception as HttpException).getResponse()
        : 'Internal server error';

    // 记录详细错误日志
    if (exception instanceof Error) {
      this.logger.error(
        `Error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    } else {
      this.logger.error(
        `Unknown error: ${JSON.stringify(exception)}`,
        null,
        `${request.method} ${request.url}`,
      );
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
