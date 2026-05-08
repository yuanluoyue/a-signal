import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { SensitiveContentError } from '../../common/errors/index.js';

const VOLCENGINE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const MODEL_NAME = 'deepseek-v3-2-251201';

export const EventSubjectSchema = z.object({
  type: z.enum(['stock', 'sector', 'index', 'commodity']),
  code: z.string(),
  weight: z.number().min(0).max(1),
});

export const EventMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  yoyChange: z.number().nullish(),
});

export const EventOutputSchema = z.object({
  category: z.enum(['macro', 'policy', 'company', 'market', 'sentiment']),
  subcategory: z.string().optional(),
  subjects: z.array(EventSubjectSchema),
  sentimentDirection: z.number().int().min(-1).max(1),
  sentimentConfidence: z.number().min(0).max(1),
  sentimentRationale: z.string().max(50),
  importanceScore: z.number().min(0).max(1),
  importanceBenchmark: z.enum(['global_daily', 'historical_similar']).nullish(),
  surpriseScore: z.number().min(-1).max(1).nullish(),
  surpriseBaseline: z.string().nullish(),
  effectiveDecayType: z.enum(['step', 'linear', 'exponential']),
  effectivePeriodDays: z.number().int().min(1).max(365),
  metrics: z.array(EventMetricSchema).nullish(),
});

export const NewsEventAnalysisSchema = z.object({
  events: z.array(EventOutputSchema).max(3),
});

export type EventOutput = z.infer<typeof EventOutputSchema>;
export type NewsEventAnalysisResult = z.infer<typeof NewsEventAnalysisSchema>;

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
        
        if (errorText.includes('InputTextSensitiveContentDetected')) {
          throw new SensitiveContentError(
            `Volcengine API detected sensitive content: ${response.status} ${response.statusText}`,
          );
        }
        
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

  async generateEventsFromNews(input: NewsAnalysisInput): Promise<NewsEventAnalysisResult> {
    const { newsTitle, newsContent, publishTime } = input;

    const systemPrompt = `你是专业的金融事件分析师，基于提供的新闻内容提取标准化金融事件。

提取规则：
1. 分析依据：优先参考新闻标题，结合正文内容，不添加任何外部信息
2. 一条新闻最多提取0-3个事件，只关注中国A股市场相关事件
3. 事件分类(category)必须为：macro(宏观经济)、policy(政策法规)、company(公司事件)、market(市场异动)、sentiment(情绪指标)
4. 子分类(subcategory)：根据事件性质自定义，如：earnings(业绩)、dividend(分红)、shareholder_change(股东变动)、product_launch(产品发布)、contract(合同)、investment(投资)等
5. subjects：只提取中国A股市场相关的标的，type必须为stock，code必须是6位数字的A股股票代码（如：000001、600000、300001、688001等），weight为关联度0~1。不要提取港股、美股、债券、基金等非A股标的。
6. sentimentDirection：-1利空/0中性/1利好
7. sentimentConfidence：0~1，LLM判断的可信度
8. sentimentRationale：简短理由，不超过50字
9. importanceScore：0~1，绝对重要性
10. surpriseScore：-1~1，负值不及预期，正值超预期（如无预期对比则不填）
11. effectiveDecayType：step(阶梯)/linear(线性)/exponential(指数)
12. effectivePeriodDays：预计影响持续天数
13. metrics：如事件包含具体数字（如营收增长率），必须提取

输出格式要求：
必须返回有效的JSON格式，结构如下：
{
  "events": [
    {
      "category": "macro|policy|company|market|sentiment",
      "subcategory": "自定义子分类",
      "subjects": [{"type": "stock", "code": "000001", "weight": 1.0}],
      "sentimentDirection": -1|0|1,
      "sentimentConfidence": 0.0~1.0,
      "sentimentRationale": "不超过50字的理由",
      "importanceScore": 0.0~1.0,
      "importanceBenchmark": "global_daily|historical_similar",
      "surpriseScore": -1.0~1.0,
      "surpriseBaseline": "预期基准描述",
      "effectiveDecayType": "step|linear|exponential",
      "effectivePeriodDays": 1~365,
      "metrics": [{"name": "指标名", "value": 0, "unit": "单位", "yoyChange": 0}]
    }
  ]
}`;

    const userPrompt = `新闻标题：${newsTitle}
新闻内容：${newsContent}
${publishTime ? `发布时间：${publishTime}` : ''}

请分析以上新闻，提取标准化金融事件。`;

    try {
      const response = await this.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 3000,
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

      const validatedResult = NewsEventAnalysisSchema.parse(parsedData);
      return validatedResult;
    } catch (error) {
      this.logger.error(
        `Event generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
