import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const VOLCENGINE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const MODEL_NAME = 'deepseek-v3-2-251201';

export const SignalSchema = z.object({
  direction: z.enum(['bullish', 'bearish', 'neutral']),
  stockCode: z.string(),
  stockName: z.string(),
  confidence: z.number().min(0).max(100),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  reasoning: z.string(),
  keyFactors: z.array(z.string()),
  timeWindow: z.string(),
});

export const NewsAnalysisSchema = z.object({
  signals: z.array(SignalSchema).max(3),
});

export type Signal = z.infer<typeof SignalSchema>;
export type NewsAnalysisResult = z.infer<typeof NewsAnalysisSchema>;

export interface NewsAnalysisInput {
  newsTitle: string;
  newsContent: string;
  publishTime?: string;
}

@Injectable()
export class VolcengineService {
  private readonly logger = new Logger(VolcengineService.name);

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('VOLCENGINE_API_KEY');
    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: 'json_object' };
    },
  ): Promise<string> {
    const apiKey = this.getApiKey();

    // 转换 messages 为火山引擎 input 格式
    const input = messages.map(msg => ({
      role: msg.role,
      content: [
        {
          type: 'input_text',
          text: msg.content,
        },
      ],
    }));

    const requestBody: Record<string, unknown> = {
      model: MODEL_NAME,
      input,
      stream: false,
    };

    if (options?.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    try {
      const response = await fetch(VOLCENGINE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Volcengine API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        }>;
        error?: {
          message?: string;
        };
      };

      if (data.error) {
        throw new Error(`Volcengine API error: ${data.error.message}`);
      }

      // 从 output 中提取文本内容
      const content = data.output?.[0]?.content?.[0]?.text;
      if (!content) {
        throw new Error('Empty response from Volcengine API');
      }

      return content;
    } catch (error) {
      this.logger.error(
        `Failed to call Volcengine API: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async analyzeNews(input: NewsAnalysisInput): Promise<NewsAnalysisResult> {
    const { newsTitle, newsContent, publishTime } = input;

    const systemPrompt = `你是专业的金融交易信号分析师，基于提供的新闻内容生成标准化交易信号。

分析规则：
1. 分析依据：优先参考新闻标题，结合正文内容
2. 股票信息：必须提取中国A股市场的股票代码和名称（格式：6位数字代码，如000001、600000、300001）
3. 情绪判定：sentiment 可选 positive/negative/neutral
4. 交易方向：direction 可选 bullish（看涨/买入）/bearish（看跌/卖出）/neutral（中性/观望）
5. 置信度：0-100的数字
6. 限制：一条新闻最多生成0-3个信号，只关注中国A股市场的股票
7. 信号发生时间取新闻发布时间，精确到小时
8. 重要：只提取中国A股市场的股票信号（股票代码为6位数字），忽略美股、港股等其他市场

输出格式要求：
必须返回有效的JSON格式，结构如下：
{
  "signals": [
    {
      "direction": "bullish|bearish|neutral",
      "stockCode": "6位数字股票代码",
      "stockName": "股票名称",
      "confidence": 0-100,
      "sentiment": "positive|negative|neutral",
      "reasoning": "分析理由",
      "keyFactors": ["关键因素1", "关键因素2"],
      "timeWindow": "时间窗口"
    }
  ]
}`;

    const userPrompt = `新闻标题：${newsTitle}
新闻内容：${newsContent}
${publishTime ? `发布时间：${publishTime}` : ''}

请分析以上新闻，生成交易信号。`;

    try {
      const response = await this.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 2000,
          responseFormat: { type: 'json_object' },
        },
      );

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response');
        }
      }

      const validatedResult = NewsAnalysisSchema.parse(parsedData);
      return validatedResult;
    } catch (error) {
      this.logger.error(
        `News analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
