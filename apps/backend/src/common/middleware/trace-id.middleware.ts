import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = randomUUID();
    (req as any).traceId = traceId;
    res.setHeader('X-Trace-Id', traceId);
    next();
  }
}
