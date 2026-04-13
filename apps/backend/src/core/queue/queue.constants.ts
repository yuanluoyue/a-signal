export const QUEUE_NAMES = {
  NEWS_CRAWL: 'news-crawl',
  NEWS_ANALYZE: 'news-analyze',
  KLINE_FETCH: 'kline-fetch',
  NEWS_VECTORIZE: 'news-vectorize',
  STOCK_TRACK_FETCH: 'stock-track-fetch',
} as const;

export const QUEUE_DELAYS = {
  [QUEUE_NAMES.NEWS_CRAWL]: 300,
  [QUEUE_NAMES.NEWS_ANALYZE]: 0,
  [QUEUE_NAMES.KLINE_FETCH]: 500,
  [QUEUE_NAMES.NEWS_VECTORIZE]: 0,
  [QUEUE_NAMES.STOCK_TRACK_FETCH]: 0,
} as const;

export const DLQ_SUFFIX = '-dlq';
export const DELAY_QUEUE_SUFFIX = '-delay';
