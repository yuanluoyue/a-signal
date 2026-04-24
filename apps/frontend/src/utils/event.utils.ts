export const EVENT_CATEGORY_MAP: Record<string, string> = {
  macro: '宏观经济',
  policy: '政策法规',
  company: '公司事件',
  market: '市场异动',
  sentiment: '情绪指标',
};

export const EVENT_SUBCATEGORY_MAP: Record<string, string> = {
  gdp: 'GDP',
  cpi: 'CPI',
  pmi: 'PMI',
  rate_decision: '利率决议',
  employment: '就业数据',
  trade_balance: '贸易差额',
  fiscal_policy: '财政政策',
  industry_policy: '产业政策',
  regulatory_change: '监管变化',
  tax_policy: '税收政策',
  subsidy: '补贴政策',
  environmental: '环保政策',
  earnings_forecast: '盈利预测',
  earnings_actual: '实际盈利',
  shareholder_reduction: '股东减持',
  shareholder_increase: '股东增持',
  dividend: '分红派息',
  m_a: '并购重组',
  management_change: '管理层变动',
  product_launch: '产品发布',
  litigation: '法律诉讼',
  index_change: '指数变化',
  sector_rotation: '板块轮动',
  volume_anomaly: '成交量异动',
  margin_trading: '融资融券',
  institutional_activity: '机构行为',
  analyst_rating: '分析师评级',
  media_sentiment: '媒体情绪',
  social_media_trend: '社交媒体趋势',
  fear_greed_index: '恐慌贪婪指数',
};

export function getEventTypeName(eventType: string | null | undefined): string {
  if (!eventType) return '-';
  
  return EVENT_SUBCATEGORY_MAP[eventType] || EVENT_CATEGORY_MAP[eventType] || eventType;
}
