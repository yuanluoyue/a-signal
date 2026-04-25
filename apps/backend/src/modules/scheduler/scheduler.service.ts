import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import { schedulerTasks, SchedulerTask } from '../../core/db/schema.js';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly dbService: DbService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDefaultTasks();
  }

  private async initializeDefaultTasks(): Promise<void> {
    const defaultTasks = [
      {
        name: 'news-crawl',
        cronExpression: '0 0 19 * * *',
        description: '每天晚上7点抓取东方财富新闻',
        enabled: true,
      },
      {
        name: 'event-analyze',
        cronExpression: '0 0 20 * * *',
        description: '每天晚上8点分析未分析的新闻',
        enabled: true,
      },
      {
        name: 'kline-update',
        cronExpression: '0 0 8 * * *',
        description: '每天早上8点更新K线数据',
        enabled: true,
      },
    ];

    for (const task of defaultTasks) {
      const existing = await this.findByName(task.name);
      if (!existing) {
        await this.dbService.db.insert(schedulerTasks).values({
          name: task.name,
          cronExpression: task.cronExpression,
          enabled: task.enabled,
        });
        this.logger.log(`Initialized default scheduler task: ${task.name}`);
      }
    }
  }

  async findAll(): Promise<SchedulerTask[]> {
    return this.dbService.db
      .select()
      .from(schedulerTasks)
      .orderBy(schedulerTasks.name);
  }

  async findById(id: string): Promise<SchedulerTask | null> {
    const result = await this.dbService.db
      .select()
      .from(schedulerTasks)
      .where(eq(schedulerTasks.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByName(name: string): Promise<SchedulerTask | null> {
    const result = await this.dbService.db
      .select()
      .from(schedulerTasks)
      .where(eq(schedulerTasks.name, name))
      .limit(1);
    return result[0] || null;
  }

  async isTaskEnabled(name: string): Promise<boolean> {
    const task = await this.findByName(name);
    return task?.enabled ?? true;
  }

  async toggleEnabled(id: string): Promise<SchedulerTask> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Scheduler task with id ${id} not found`);
    }

    const result = await this.dbService.db
      .update(schedulerTasks)
      .set({
        enabled: !existing.enabled,
      })
      .where(eq(schedulerTasks.id, id))
      .returning();

    this.logger.log(
      `${result[0].enabled ? 'Enabled' : 'Disabled'} scheduler task: ${result[0].name} (${result[0].id})`,
    );
    return result[0];
  }

  async updateLastExecutedAt(idOrName: string): Promise<void> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);

    let task = null;

    if (isUUID) {
      task = await this.findById(idOrName);
    }

    if (!task) {
      task = await this.findByName(idOrName);
    }

    if (!task) {
      this.logger.warn(`Scheduler task not found: ${idOrName}`);
      return;
    }

    await this.dbService.db
      .update(schedulerTasks)
      .set({
        lastExecutedAt: new Date(),
      })
      .where(eq(schedulerTasks.id, task.id));
  }
}
