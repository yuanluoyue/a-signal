import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { DatabaseService } from '../database/database.service.js';
import { QueueService } from '../queue/queue.service.js';
import { news, type NewNews } from '../database/schema.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { NewsListQueryDto } from './dto/news-list-query.dto.js';

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
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
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

  /**
   * 生成 URL 的 MD5 hash 作为 uniqueKey
   */
  generateUniqueKey(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  /**
   * 检查新闻是否已存在
   */
  async isNewsExists(uniqueKey: string): Promise<boolean> {
    const existing = await this.databaseService.db
      .select({ id: news.id })
      .from(news)
      .where(eq(news.uniqueKey, uniqueKey))
      .limit(1);

    return existing.length > 0;
  }

  /**
   * 保存新闻到数据库
   */
  async saveNews(newsData: NewsDetail): Promise<void> {
    const uniqueKey = this.generateUniqueKey(newsData.originalUrl);

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

    await this.databaseService.db.insert(news).values(newNews);
    this.logger.log(`Saved news: ${newsData.title}`);
  }

  /**
   * 抓取东方财富财经导读列表页
   * @param page 页码
   */
  async crawlListPage(page: number): Promise<NewsListItem[]> {
    const url = `${this.baseUrl}/a/ccjdd_${page}.html`;
    this.logger.log(`Crawling list page: ${url}`);

    try {
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);
      const newsItems: NewsListItem[] = [];

      // 东方财富财经导读列表页的新闻项选择器
      $('.news-item, .article-item, .list-item, .newsList li, .newslist li').each(
        (_, element) => {
          const $el = $(element);
          const linkEl = $el.find('a[href]').first();
          const title = linkEl.text().trim();
          let href = linkEl.attr('href') || '';

          // 处理相对链接
          if (href && !href.startsWith('http')) {
            href = new URL(href, this.baseUrl).href;
          }

          // 提取发布时间
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

      // 如果上面的选择器没有匹配到，尝试其他常见的选择器
      if (newsItems.length === 0) {
        $('a[href*="/a/"]').each((_, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          let href = $el.attr('href') || '';

          if (href && !href.startsWith('http')) {
            href = new URL(href, this.baseUrl).href;
          }

          // 过滤掉非新闻链接和空标题
          if (title && href && href.includes('/a/') && title.length > 10) {
            // 去重
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

  /**
   * 抓取新闻详情页
   * @param url 新闻详情页 URL
   */
  async crawlDetailPage(url: string): Promise<NewsDetail | null> {
    this.logger.log(`Crawling detail page: ${url}`);

    try {
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      // 提取标题
      let title =
        $('h1').first().text().trim() ||
        $('.news-title').text().trim() ||
        $('.article-title').text().trim() ||
        $('title').text().trim();

      // 提取正文内容
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
          // 移除脚本和样式标签
          el.find('script, style, iframe, .ad, .advertisement').remove();
          content = el.text().trim();
          if (content.length > 100) {
            break;
          }
        }
      }

      // 如果上面的选择器没有匹配到，尝试从 body 中提取
      if (!content || content.length < 100) {
        const bodyContent = $('body')
          .clone()
          .find('script, style, nav, header, footer, .ad, .advertisement, .sidebar')
          .remove()
          .end()
          .text()
          .trim();
        content = bodyContent.substring(0, 10000); // 限制长度
      }

      // 提取发布时间
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

      // 如果没有提取到标题或内容，返回 null
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

  /**
   * 解析发布时间字符串
   */
  private parsePublishTime(timeText: string): Date | null {
    // 匹配常见的日期格式
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

  /**
   * 抓取前 N 页新闻并发送到队列
   * @param maxPages 最大页数
   */
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

          // 发送详情页抓取任务到队列
          const task: CrawlDetailTask = {
            url: item.url,
            title: item.title,
            publishTime: item.publishTime,
          };

          await this.queueService.sendMessage(QUEUE_NAMES.NEWS_CRAWL, task);
          this.logger.debug(`Queued detail crawl task: ${item.title}`);
        }

        // 列表页之间添加延迟，避免请求过快
        if (page < maxPages) {
          await this.delay(1000);
        }
      } catch (error) {
        this.logger.error(`Error crawling page ${page}:`, error);
      }
    }

    this.logger.log(`Finished queuing news crawl tasks`);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取最近的新闻列表
   */
  async getRecentNews(limit: number = 20): Promise<typeof news.$inferSelect[]> {
    return this.databaseService.db
      .select()
      .from(news)
      .orderBy(news.publishTime)
      .limit(limit);
  }

  /**
   * 根据 ID 获取新闻
   */
  async getNewsById(id: string): Promise<typeof news.$inferSelect | null> {
    const result = await this.databaseService.db
      .select()
      .from(news)
      .where(eq(news.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 获取新闻列表（支持分页和筛选）
   */
  async getNewsList(query: NewsListQueryDto): Promise<{ data: typeof news.$inferSelect[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, source, analyzeStatus, vectorizeStatus } = query;
    const offset = (page - 1) * pageSize;

    // 构建筛选条件
    const conditions: ReturnType<typeof eq>[] = [];
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

    // 查询总数
    const countResult = await this.databaseService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(news)
      .where(whereClause || sql`1=1`);
    const total = Number(countResult[0]?.count || 0);

    // 查询数据
    const data = await this.databaseService.db
      .select()
      .from(news)
      .where(whereClause || sql`1=1`)
      .orderBy(desc(news.publishTime))
      .limit(pageSize)
      .offset(offset);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 更新新闻分析状态
   */
  async updateAnalyzeStatus(id: string, status: 'pending' | 'analyzing' | 'analyzed' | 'failed'): Promise<void> {
    await this.databaseService.db
      .update(news)
      .set({ analyzeStatus: status })
      .where(eq(news.id, id));
    
    this.logger.log(`Updated news ${id} analyzeStatus to ${status}`);
  }

  /**
   * 删除新闻
   */
  async deleteNews(id: string): Promise<void> {
    await this.databaseService.db
      .delete(news)
      .where(eq(news.id, id));
    
    this.logger.log(`Deleted news ${id}`);
  }
}
