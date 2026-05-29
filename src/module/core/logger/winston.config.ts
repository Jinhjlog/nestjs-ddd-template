import * as winston from 'winston';
// import * as DailyRotateFile from 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export interface WinstonConfigOptions {
  level: string;
  directory: string;
  maxFiles: string;
  maxSize: string;
  nodeEnv: string;
}

export const createWinstonConfig = (
  options: WinstonConfigOptions,
): winston.LoggerOptions => {
  const { level, nodeEnv } = options;
  const isProduction = nodeEnv === 'production';

  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
  );

  const devFormat = winston.format.combine(
    baseFormat,
    nestWinstonModuleUtilities.format.nestLike('APP', {
      prettyPrint: true,
      colors: true,
    }),
  );

  const prodFormat = winston.format.combine(baseFormat, winston.format.json());

  // 파일 저장 비활성화로 인해 사용하지 않음
  // const fileTransportOptions = {
  //   dirname: directory,
  //   datePattern: 'YYYY-MM-DD',
  //   maxFiles: maxFiles,
  //   maxSize: maxSize,
  //   zippedArchive: true,
  //   format: winston.format.combine(baseFormat, winston.format.json()),
  // };

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction ? prodFormat : devFormat,
    }),

    // 파일 저장 비활성화 (Cloud Run 환경에서는 의미 없음)
    // new DailyRotateFile({
    //   ...fileTransportOptions,
    //   filename: 'app-%DATE%.log',
    //   level: level,
    // }),

    // new DailyRotateFile({
    //   ...fileTransportOptions,
    //   filename: 'error-%DATE%.log',
    //   level: 'error',
    // }),
  ];

  return {
    level: level,
    format: isProduction ? prodFormat : devFormat,
    transports,
    // 파일 저장 비활성화
    // exceptionHandlers: [
    //   new DailyRotateFile({
    //     ...fileTransportOptions,
    //     filename: 'exceptions-%DATE%.log',
    //   }),
    // ],
    // rejectionHandlers: [
    //   new DailyRotateFile({
    //     ...fileTransportOptions,
    //     filename: 'rejections-%DATE%.log',
    //   }),
    // ],
  };
};
