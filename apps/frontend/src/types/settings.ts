/**
 * 系统设置类型定义
 */

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  trading: TradingSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  signalAlert: boolean;
  priceAlert: boolean;
  newsAlert: boolean;
}

export interface TradingSettings {
  defaultTakeProfit: number;
  defaultStopLoss: number;
  maxPositionSize: number;
  riskPerTrade: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxSignalsPerDay: number;
  dataRetentionDays: number;
}

export interface SettingsUpdateRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: Partial<NotificationSettings>;
  trading?: Partial<TradingSettings>;
}
