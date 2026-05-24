import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createWinstonLogger } from './core/logger/winston.logger';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import { QueueService } from './core/queue/queue.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'mcp/v1/(.*)', 'admin/queues/(.*)'],
  });

  let boardRouter: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
  app.use('/admin/queues', (req: Request, res: Response, next: NextFunction) => {
    if (!boardRouter) {
      const queueService = app.get(QueueService);
      const boardAdapter = queueService.getBoardAdapter();
      if (boardAdapter) {
        boardRouter = boardAdapter.getRouter();
      }
    }
    if (boardRouter) {
      boardRouter(req, res, next);
    } else {
      next();
    }
  });

  app.use(new TraceIdMiddleware().use.bind(new TraceIdMiddleware()));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('A Signal API')
    .setDescription('股票分析系统 API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
  console.log(`Bull Board: http://localhost:${port}/admin/queues`);
}
bootstrap();
