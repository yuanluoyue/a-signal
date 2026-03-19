import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 创建 Winston 日志配置
 * 同时输出到控制台（带颜色）和文件
 */
export function createWinstonLogger() {
  // 确保日志目录存在
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];

  const transports: winston.transport[] = [
    // 控制台输出 - 带颜色
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('A-Signal', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    // 文件输出 - 所有日志
    new winston.transports.File({
      filename: path.join(logDir, `app-${date}.log`),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // 文件输出 - 仅错误日志
    new winston.transports.File({
      filename: path.join(logDir, `error-${date}.log`),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ];

  return WinstonModule.createLogger({
    transports,
  });
}
