import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, or, like } from 'drizzle-orm';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { DbService } from '../../core/db/db.service.js';
import { QueueService } from '../../core/queue/queue.service.js';
import { VectorService } from '../../core/vector/vector.service.js';
import { NewsFilterAgentService } from '../news-filter-agent/news-filter-agent.service.js';
import { news, signals, events, type NewNews } from '../../core/db/schema.js';
import { QUEUE_NAMES } from '../../core/queue/queue.constants.js';
import { NewsListQueryDto } from '../../interfaces/admin/news/dto/news-list-query.dto.js';

export interface NewsListItem {
  title: string;
  url: string;
  publishTime: string;
}

export interface NewsDetail {
  title: string;
  content: string;
  publishTime: Date;
  originalUrl: string;
  uniqueKey: string;
}

export interface CrawlDetailTask {
  url: string;
  title: string;
  publishTime: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://finance.eastmoney.com';
  private readonly source = '东方财富';

  constructor(
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
    private readonly vectorService: VectorService,
    private readonly newsFilterAgentService: NewsFilterAgentService,
  ) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
  }

  generateUniqueKey(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  async isNewsExists(uniqueKey: string): Promise<boolean> {
    const existing = await this.dbService.db
      .select({ id: news.id })
      .from(news)
      .where(eq(news.uniqueKey, uniqueKey))
      .limit(1);

    return existing.length > 0;
  }

  async saveNews(newsData: NewsDetail): Promise<void> {
    const uniqueKey = newsData.uniqueKey || this.generateUniqueKey(newsData.originalUrl);

    const exists = await this.isNewsExists(uniqueKey);
    if (exists) {
      this.logger.debug(`News already exists: ${newsData.title}`);
      return;
    }

    const newNews: NewNews = {
      title: newsData.title,
      content: newsData.content,
      source: this.source,
      publishTime: newsData.publishTime,
      originalUrl: newsData.originalUrl,
      uniqueKey,
      analyzeStatus: 'pending',
      vectorizeStatus: 'pending',
    };

    await this.dbService.db.insert(news).values(newNews);
    this.logger.log(`Saved news: ${newsData.title}`);
  }

  async crawlListPage(page: number): Promise<NewsListItem[]> {
    const url = `${this.baseUrl}/a/ccjdd_${page}.html`;
    this.logger.log(`Crawling list page: ${url}`);

    try {
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);
      const newsItems: NewsListItem[] = [];

      $('.news-item, .article-item, .list-item, .newsList li, .newslist li').each(
        (_, element) => {
          const $el = $(element);
          const linkEl = $el.find('a[href]').first();
          const title = linkEl.text().trim();
          let href = linkEl.attr('href') || '';

          if (href && !href.startsWith('http')) {
            href = new URL(href, this.baseUrl).href;
          }

          let publishTime = '';
          const timeEl = $el.find('.time, .date, .pub-time, .publish-time, span').filter(function() {
            return /\d{4}[-/]\d{2}[-/]\d{2}/.test($(this).text());
          });

          if (timeEl.length > 0) {
            publishTime = timeEl.first().text().trim();
          }

          if (title && href) {
            newsItems.push({
              title,
              url: href,
              publishTime,
            });
          }
        },
      );

      if (newsItems.length === 0) {
        $('a[href*="/a/"]').each((_, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          let href = $el.attr('href') || '';

          if (href && !href.startsWith('http')) {
            href = new URL(href, this.baseUrl).href;
          }

          if (title && href && href.includes('/a/') && title.length > 10) {
            if (!newsItems.some((item) => item.url === href)) {
              newsItems.push({
                title,
                url: href,
                publishTime: new Date().toISOString(),
              });
            }
          }
        });
      }

      this.logger.log(`Found ${newsItems.length} news items on page ${page}`);
      return newsItems;
    } catch (error) {
      this.logger.error(`Failed to crawl list page ${page}:`, error);
      throw error;
    }
  }

  async crawlDetailPage(url: string): Promise<NewsDetail | null> {
    this.logger.log(`Crawling detail page: ${url}`);

    try {
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      let title =
        $('h1').first().text().trim() ||
        $('.news-title').text().trim() ||
        $('.article-title').text().trim() ||
        $('title').text().trim();

      let content = '';
      const contentSelectors = [
        '#ContentBody',
        '.news-content',
        '.article-content',
        '.content-detail',
        '.main-content',
        '#main-content',
        '.detail-content',
        '.text-content',
      ];

      for (const selector of contentSelectors) {
        const el = $(selector);
        if (el.length > 0) {
          el.find('script, style, iframe, .ad, .advertisement').remove();
          content = el.text().trim();
          if (content.length > 100) {
            break;
          }
        }
      }

      if (!content || content.length < 100) {
        const bodyContent = $('body')
          .clone()
          .find('script, style, nav, header, footer, .ad, .advertisement, .sidebar')
          .remove()
          .end()
          .text()
          .trim();
        content = bodyContent.substring(0, 10000);
      }

      let publishTime = new Date();
      const timeSelectors = [
        '.time-source',
        '.publish-time',
        '.pub-time',
        '.news-time',
        '.article-time',
        'time',
        '.date',
      ];

      for (const selector of timeSelectors) {
        const timeText = $(selector).first().text().trim();
        if (timeText) {
          const parsedTime = this.parsePublishTime(timeText);
          if (parsedTime) {
            publishTime = parsedTime;
            break;
          }
        }
      }

      if (!title || !content || content.length < 50) {
        this.logger.warn(`Failed to extract content from: ${url}`);
        return null;
      }

      const uniqueKey = this.generateUniqueKey(url);

      return {
        title,
        content,
        publishTime,
        originalUrl: url,
        uniqueKey,
      };
    } catch (error) {
      this.logger.error(`Failed to crawl detail page: ${url}`, error);
      throw error;
    }
  }

  private parsePublishTime(timeText: string): Date | null {
    const patterns = [
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*(\d{2}):(\d{2}):?(\d{2})?/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{2}):(\d{2}):?(\d{2})?/,
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = timeText.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const hour = match[4] ? parseInt(match[4], 10) : 0;
        const minute = match[5] ? parseInt(match[5], 10) : 0;
        const second = match[6] ? parseInt(match[6], 10) : 0;

        return new Date(year, month, day, hour, minute, second);
      }
    }

    return null;
  }

  async crawlAndQueueNews(maxPages: number = 3): Promise<void> {
    this.logger.log(`Starting to crawl ${maxPages} pages of news`);

    for (let page = 1; page <= maxPages; page++) {
      try {
        const newsItems = await this.crawlListPage(page);

        for (const item of newsItems) {
          const uniqueKey = this.generateUniqueKey(item.url);
          const exists = await this.isNewsExists(uniqueKey);

          if (exists) {
            this.logger.debug(`Skipping existing news: ${item.title}`);
            continue;
          }

          const task: CrawlDetailTask = {
            url: item.url,
            title: item.title,
            publishTime: item.publishTime,
          };

          await this.queueService.sendMessage(QUEUE_NAMES.NEWS_CRAWL, task);
          this.logger.debug(`Queued detail crawl task: ${item.title}`);
        }

        if (page < maxPages) {
          await this.delay(1000);
        }
      } catch (error) {
        this.logger.error(`Error crawling page ${page}:`, error);
      }
    }

    this.logger.log(`Finished queuing news crawl tasks`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getRecentNews(limit: number = 20): Promise<typeof news.$inferSelect[]> {
    return this.dbService.db
      .select()
      .from(news)
      .orderBy(news.publishTime)
      .limit(limit);
  }

  async getNewsById(id: string): Promise<typeof news.$inferSelect | null> {
    const result = await this.dbService.db
      .select()
      .from(news)
      .where(eq(news.id, id))
      .limit(1);

    return result[0] || null;
  }

  async getNewsList(query: NewsListQueryDto): Promise<{ data: Array<typeof news.$inferSelect & { eventCount: number }>; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, keyword, source, analyzeStatus, vectorizeStatus } = query;
    const offset = (page - 1) * pageSize;

    const conditions: ReturnType<typeof eq>[] = [];
    if (keyword) {
      conditions.push(
        or(
          like(news.title, `%${keyword}%`),
          like(news.content, `%${keyword}%`)
        )!
      );
    }
    if (source) {
      conditions.push(eq(news.source, source));
    }
    if (analyzeStatus) {
      conditions.push(eq(news.analyzeStatus, analyzeStatus));
    }
    if (vectorizeStatus) {
      conditions.push(eq(news.vectorizeStatus, vectorizeStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await this.dbService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(whereClause || sql`1=1`);
    const total = Number(countResult[0]?.count || 0);

    const newsData = await this.dbService.db
      .select()
      .from(news)
      .where(whereClause || sql`1=1`)
      .orderBy(desc(news.publishTime))
      .limit(pageSize)
      .offset(offset);

    const newsIds = newsData.map(n => n.id);
    let eventCountMap: Record<string, number> = {};
    
    if (newsIds.length > 0) {
      const eventsData = await this.dbService.db
        .select({
          newsId: events.newsId,
        })
        .from(events)
        .where(sql`${events.newsId} IN ${newsIds}`);

      eventsData.forEach(e => {
        if (e.newsId) {
          if (!eventCountMap[e.newsId]) {
            eventCountMap[e.newsId] = 0;
          }
          eventCountMap[e.newsId]++;
        }
      });
    }

    const data = newsData.map(n => ({
      ...n,
      eventCount: eventCountMap[n.id] || 0,
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async updateAnalyzeStatus(id: string, status: 'pending' | 'analyzing' | 'analyzed' | 'failed' | 'filtered'): Promise<void> {
    await this.dbService.db
      .update(news)
      .set({ analyzeStatus: status })
      .where(eq(news.id, id));

    this.logger.log(`Updated news ${id} analyzeStatus to ${status}`);
  }

  async deleteNews(id: string): Promise<void> {
    await this.dbService.db
      .delete(news)
      .where(eq(news.id, id));

    this.logger.log(`Deleted news ${id}`);
  }

  async updateVectorizeStatus(id: string, status: 'pending' | 'vectorizing' | 'vectorized' | 'failed'): Promise<void> {
    await this.dbService.db
      .update(news)
      .set({ vectorizeStatus: status })
      .where(eq(news.id, id));

    this.logger.log(`Updated news ${id} vectorizeStatus to ${status}`);
  }

  async updateEmbeddingModel(id: string, model: string): Promise<void> {
    await this.dbService.db
      .update(news)
      .set({ embeddingModel: model })
      .where(eq(news.id, id));

    this.logger.log(`Updated news ${id} embeddingModel to ${model}`);
  }

  async getVectorizeProgress(): Promise<{ pending: number; vectorizing: number; vectorized: number; failed: number }> {
    const [result] = await this.dbService.db
      .select({
        pending: sql<number>`COUNT(*) FILTER (WHERE ${news.vectorizeStatus} = 'pending')`,
        vectorizing: sql<number>`COUNT(*) FILTER (WHERE ${news.vectorizeStatus} = 'vectorizing')`,
        vectorized: sql<number>`COUNT(*) FILTER (WHERE ${news.vectorizeStatus} = 'vectorized')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${news.vectorizeStatus} = 'failed')`,
      })
      .from(news);

    return {
      pending: Number(result.pending || 0),
      vectorizing: Number(result.vectorizing || 0),
      vectorized: Number(result.vectorized || 0),
      failed: Number(result.failed || 0),
    };
  }

  async getPendingVectorizeNews(limit: number = 100): Promise<typeof news.$inferSelect[]> {
    return this.dbService.db
      .select()
      .from(news)
      .where(eq(news.vectorizeStatus, 'pending'))
      .orderBy(news.publishTime)
      .limit(limit);
  }

  async reVectorizeNews(id: string): Promise<void> {
    await this.vectorService.deleteEmbedding(id);

    await this.dbService.db
      .update(news)
      .set({
        vectorizeStatus: 'pending',
        embeddingModel: null
      })
      .where(eq(news.id, id));

    this.logger.log(`Reset vectorize status for news ${id}`);
  }

  async getVectorizedNews(): Promise<typeof news.$inferSelect[]> {
    return this.dbService.db
      .select()
      .from(news)
      .where(eq(news.vectorizeStatus, 'vectorized'))
      .orderBy(news.publishTime);
  }
}
