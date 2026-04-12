import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NewsService } from '../../../modules/news/news.service.js';
import { SignalsService } from '../../../modules/signals/signals.service.js';
import { QueueService } from '../../../core/queue/queue.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { NewsListQueryDto } from './dto/news-list-query.dto.js';
import { QUEUE_NAMES } from '../../../core/queue/queue.constants.js';

@ApiTags('新闻管理')
@Controller('news')
@ApiBearerAuth()
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly signalsService: SignalsService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取新闻列表（支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '成功获取新闻列表' })
  async getNewsList(@Query() query: NewsListQueryDto) {
    const result = await this.newsService.getNewsList(query);
    return result;
  }

  @Get('vectorize-progress')
  @Public()
  @ApiOperation({ summary: '获取向量化进度统计' })
  @ApiResponse({ status: 200, description: '成功获取进度统计' })
  async getVectorizeProgress() {
    const progress = await this.newsService.getVectorizeProgress();
    return {
      data: progress,
    };
  }

  @Post('crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '触发新闻抓取任务' })
  @ApiQuery({
    name: 'pages',
    required: false,
    description: '抓取页数（默认3页）',
    type: Number,
  })
  @ApiResponse({ status: 202, description: '抓取任务已启动' })
  async triggerCrawl(
    @Query('pages', new DefaultValuePipe(3), ParseIntPipe) pages: number,
  ) {
    this.newsService.crawlAndQueueNews(pages).catch((error) => {
      console.error('Crawl task failed:', error);
    });

    return {
      message: '新闻抓取任务已启动',
      pages,
    };
  }

  @Post('crawl/sync')
  @ApiOperation({ summary: '同步执行新闻抓取任务' })
  @ApiQuery({
    name: 'pages',
    required: false,
    description: '抓取页数（默认3页）',
    type: Number,
  })
  @ApiResponse({ status: 200, description: '抓取任务完成' })
  async triggerCrawlSync(
    @Query('pages', new DefaultValuePipe(3), ParseIntPipe) pages: number,
  ) {
    await this.newsService.crawlAndQueueNews(pages);

    return {
      message: '新闻抓取任务已完成',
      pages,
    };
  }

  @Post('batch-vectorize')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '批量向量化所有待处理新闻' })
  @ApiResponse({ status: 202, description: '批量向量化任务已启动' })
  async batchVectorizeNews() {
    const pendingNews = await this.newsService.getPendingVectorizeNews(100);

    for (const item of pendingNews) {
      await this.newsService.updateVectorizeStatus(item.id, 'vectorizing');
      await this.queueService.sendMessage(QUEUE_NAMES.NEWS_VECTORIZE, { newsId: item.id });
    }

    return {
      message: '批量向量化任务已启动',
      count: pendingNews.length,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '根据 ID 获取新闻详情' })
  @ApiParam({ name: 'id', description: '新闻 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取新闻详情' })
  @ApiResponse({ status: 404, description: '新闻不存在' })
  async getNewsById(@Param('id') id: string) {
    const news = await this.newsService.getNewsById(id);
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }
    return {
      data: news,
    };
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '手动触发新闻分析任务' })
  @ApiParam({ name: 'id', description: '新闻 ID', type: String })
  @ApiResponse({ status: 202, description: '分析任务已提交到队列' })
  @ApiResponse({ status: 404, description: '新闻不存在' })
  @ApiResponse({ status: 400, description: '新闻已分析过' })
  async analyzeNews(@Param('id') id: string) {
    const news = await this.newsService.getNewsById(id);
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }

    if (news.analyzeStatus === 'analyzed') {
      return {
        message: '新闻已分析过，无需重复分析',
        newsId: id,
        status: news.analyzeStatus,
      };
    }

    if (news.analyzeStatus === 'analyzing') {
      return {
        message: '新闻正在分析中，请稍后再试',
        newsId: id,
        status: news.analyzeStatus,
      };
    }

    await this.newsService.updateAnalyzeStatus(id, 'analyzing');

    console.log(`[NewsController] Sending news ${id} to queue ${QUEUE_NAMES.NEWS_ANALYZE}`);
    await this.queueService.sendMessage(QUEUE_NAMES.NEWS_ANALYZE, { newsId: id });
    console.log(`[NewsController] Successfully sent news ${id} to queue`);

    return {
      message: '新闻分析任务已提交到队列',
      newsId: id,
    };
  }

  @Get(':id/signals')
  @Public()
  @ApiOperation({ summary: '获取新闻关联的信号列表' })
  @ApiParam({ name: 'id', description: '新闻 ID', type: String })
  @ApiResponse({ status: 200, description: '成功获取信号列表' })
  @ApiResponse({ status: 404, description: '新闻不存在' })
  async getNewsSignals(@Param('id') id: string) {
    const news = await this.newsService.getNewsById(id);
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }

    const signals = await this.signalsService.findByNewsId(id);
    return {
      data: signals,
      total: signals.length,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除新闻' })
  @ApiParam({ name: 'id', description: '新闻 ID', type: String })
  @ApiResponse({ status: 200, description: '新闻已删除' })
  @ApiResponse({ status: 404, description: '新闻不存在' })
  async deleteNews(@Param('id') id: string) {
    const news = await this.newsService.getNewsById(id);
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }

    await this.newsService.deleteNews(id);

    return {
      message: '新闻已删除',
      id,
    };
  }

  @Post(':id/vectorize')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '单条新闻向量化' })
  @ApiParam({ name: 'id', description: '新闻 ID', type: String })
  @ApiResponse({ status: 202, description: '向量化任务已提交' })
  @ApiResponse({ status: 404, description: '新闻不存在' })
  async vectorizeNews(@Param('id') id: string) {
    const news = await this.newsService.getNewsById(id);
    if (!news) {
      throw new NotFoundException('新闻不存在');
    }

    await this.newsService.updateVectorizeStatus(id, 'vectorizing');

    await this.queueService.sendMessage(QUEUE_NAMES.NEWS_VECTORIZE, { newsId: id });

    return {
      message: '新闻向量化任务已提交',
      newsId: id,
    };
  }
}
