export const QUEUE_NAMES = {
  NEWS_CRAWL: 'news-crawl',
  NEWS_ANALYZE: 'news-analyze',
  KLINE_FETCH: 'kline-fetch',
} as const;

export const QUEUE_DELAYS = {
  [QUEUE_NAMES.NEWS_CRAWL]: 300,
  [QUEUE_NAMES.NEWS_ANALYZE]: 0,
  [QUEUE_NAMES.KLINE_FETCH]: 500,
} as const;

export const DLQ_SUFFIX = '-dlq';
export const DELAY_QUEUE_SUFFIX = '-delay';
