---
name: news-analyze
description: 编写新闻分析模块的时候参考这个 skill
---

# Skill：新闻分析生成交易信号（精简版）
## 核心目标
基于 NestJS + LangChain 实现新闻分析功能，输入含可选标题的新闻内容，输出带股票信息的结构化交易信号，遵循项目已有 NestJS 最佳实践。

## 入参规范
- 必传：newsContent（新闻正文，string）
- 可选：newsTitle（新闻标题，string | undefined）

## 出参结构化字段（新增字段标注★）
| 字段名       | 类型/约束                          | 说明                     |
|--------------|------------------------------------|--------------------------|
| direction    | 枚举：buy/sell/hold/neutral        | 交易方向                 |
| target       | string                             | 交易标的（兼容股票名称） |
| ★stockCode   | string                             | 股票代码（如 600519、AAPL）|
| ★stockName   | string                             | 股票名称（如 贵州茅台）|
| confidence   | number（0-100）                    | 信号置信度               |
| ★sentiment   | 枚举：positive/negative/neutral    | 新闻情绪倾向             |
| reasoning    | string                             | 分析理由（关联标题+内容）|
| keyFactors   | string[]                           | 关键影响因子             |
| timeWindow   | string                             | 信号有效期               |

## 核心技术实现（LangChain 示例代码）
### 1. Zod 结构化 Schema 定义
```typescript
import { z } from 'zod';
const tradeSignalSchema = z.object({
  direction: z.enum(['buy', 'sell', 'hold', 'neutral']),
  target: z.string(),
  stockCode: z.string(),
  stockName: z.string(),
  confidence: z.number().min(0).max(100),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  reasoning: z.string(),
  keyFactors: z.array(z.string()),
  timeWindow: z.string(),
});
```
### 2. 完整 Prompt 模板
```
const promptTemplate = PromptTemplate.fromTemplate(`
你是专业的金融交易信号分析师，仅基于提供的新闻内容（含标题）生成标准化交易信号，严格遵守以下规则：
1. 分析依据：优先参考新闻标题（如有），结合正文内容，不添加任何外部信息；
2. 股票信息：必须提取股票代码和名称（如无明确标的则填"未知"），代码与名称需严格匹配；
3. 情绪判定：sentiment 仅可选 positive/negative/neutral，需客观反映新闻对股票的情绪倾向；
4. 交易方向：direction 仅可选 buy/sell/hold/neutral，需与 sentiment 逻辑自洽（如 positive 优先对应 buy/hold）；
5. 置信度：confidence 为 0-100 的数字，越高代表信号越可靠，无明确依据时填 0；
6. 理由与因子：reasoning 需详细说明信号推导过程（100 字内），keyFactors 提取3-5个核心影响因子；
7. 时间窗口：timeWindow 填写信号有效期（如"1天""3天""1周"），无明确判断则填"1天"；
8. 输出格式：严格按照指定结构化格式输出，不添加任何额外文字或注释。

新闻标题：{newsTitle}
新闻内容：{newsContent}
格式化指令：{format_instructions}
`);
```

## 核心逻辑要求
stockCode/stockName 需匹配（如 600519 ↔ 贵州茅台），无明确标的时填「未知」；
sentiment 与 direction 逻辑自洽（如 negative 优先对应 sell/hold，neutral 对应 neutral）；
兼容单条 / 批量分析，批量时单条失败不中断，返回兜底值（如 stockCode = 未知、sentiment=neutral）；
复用项目已有 NestJS 最佳实践（模块分层、日志、异常处理、环境变量等）。
## 接口简化要求
单条分析：POST /trade-signal/analyze，入参 {newsTitle?: string, newsContent: string}
批量分析：POST /trade-signal/batch-analyze，入参 {newsList: Array<{ newsTitle?: string, newsContent: string}> }