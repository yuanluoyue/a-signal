import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { QueueConsumerRegistry } from './queue.consumer.js';

@Global()
@Module({
  providers: [QueueService, QueueConsumerRegistry],
  exports: [QueueService, QueueConsumerRegistry],
})
export class QueueModule {}
