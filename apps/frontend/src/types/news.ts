export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  analysisStatus: AnalysisStatus;
  vectorizedStatus: VectorizedStatus;
  relatedStocks: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type AnalysisStatus = 'pending' | 'analyzing' | 'analyzed' | 'failed';

export type VectorizedStatus = 'pending' | 'vectorized' | 'failed';

export interface NewsFilter {
  source?: string;
  analysisStatus?: AnalysisStatus;
  vectorizedStatus?: VectorizedStatus;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewsAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  keyPoints: string[];
  relatedSignals?: NewsSignal[];
}

export interface NewsSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  confidence: number;
  createdAt: string;
}

export interface AnalyzeNewsRequest {
  newsId: string;
}

export interface AnalyzeNewsResponse {
  success: boolean;
  result?: NewsAnalysisResult;
  error?: string;
}
