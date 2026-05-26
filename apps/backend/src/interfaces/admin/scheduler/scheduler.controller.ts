import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulerService } from '../../../modules/scheduler/scheduler.service.js';
import { SchedulerTasksService } from '../../../jobs/scheduler-tasks.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';

@ApiTags('定时任务管理')
@Controller('scheduler-tasks')
@ApiBearerAuth()
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly schedulerTasksService: SchedulerTasksService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取定时任务列表' })
  @ApiResponse({ status: 200, description: '成功获取定时任务列表' })
  async getSchedulerTasks() {
    const tasks = await this.schedulerService.findAll();
    return {
      data: tasks,
      total: tasks.length,
    };
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: '启用/禁用定时任务' })
  @ApiParam({ name: 'id', description: '任务 ID', type: String })
  @ApiResponse({ status: 200, description: '定时任务状态切换成功' })
  @ApiResponse({ status: 404, description: '定时任务不存在' })
  async toggleTask(@Param('id') id: string) {
    const task = await this.schedulerService.toggleEnabled(id);
    return {
      data: task,
      message: task.enabled ? '定时任务已启用' : '定时任务已禁用',
    };
  }

  @Post(':id/trigger')
  @ApiOperation({ summary: '手动触发定时任务' })
  @ApiParam({ name: 'id', description: '任务 ID', type: String })
  @ApiResponse({ status: 200, description: '定时任务手动触发成功' })
  @ApiResponse({ status: 404, description: '定时任务不存在' })
  async triggerTask(@Param('id') id: string) {
    this.logger.log(`[triggerTask] Received request to trigger task id: ${id}`);
    
    const task = await this.schedulerService.findById(id);
    if (!task) {
      this.logger.warn(`[triggerTask] Task not found: ${id}`);
      throw new NotFoundException('定时任务不存在');
    }

    this.logger.log(`[triggerTask] Found task: ${task.name}, starting execution...`);

    try {
      switch (task.name) {
        case 'news-crawl':
          this.logger.log('[triggerTask] Executing news-crawl task...');
          await this.schedulerTasksService.manualNewsCrawl();
          break;
        case 'event-analyze':
          this.logger.log('[triggerTask] Executing event-analyze task...');
          await this.schedulerTasksService.manualEventAnalyze();
          break;
        case 'kline-update':
          this.logger.log('[triggerTask] Executing kline-update task...');
          await this.schedulerTasksService.manualKlineUpdate();
          break;
        case 'simulation-refresh':
          this.logger.log('[triggerTask] Executing simulation-refresh task...');
          await this.schedulerTasksService.manualSimulationRefresh();
          break;
        default:
          this.logger.warn(`[triggerTask] Unknown task name: ${task.name}`);
          throw new NotFoundException(`未知的任务类型: ${task.name}`);
      }

      this.logger.log(`[triggerTask] Task ${task.name} executed successfully`);
      
      return {
        data: task,
        message: `定时任务 "${task.name}" 已成功执行`,
      };
    } catch (error) {
      this.logger.error(`[triggerTask] Task execution failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
