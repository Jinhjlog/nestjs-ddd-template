import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig, WinstonConfigOptions } from './winston.config';
import { EnvironmentConfig } from '../config/environment.config';
import { LoggerMiddleware } from './logger.middleware';

const DEFAULT_LOGGER_CONFIG: Omit<WinstonConfigOptions, 'nodeEnv'> = {
  level: 'info',
  directory: 'logs',
  maxFiles: '30d',
  maxSize: '20m',
};

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService<EnvironmentConfig, true>) => {
        const loggerConfig =
          configService.get('logger', { infer: true }) ?? DEFAULT_LOGGER_CONFIG;

        return createWinstonConfig({
          ...loggerConfig,
          nodeEnv: process.env.NODE_ENV || 'development',
        });
      },
      inject: [ConfigService],
    }),
  ],
  providers: [LoggerMiddleware],
  exports: [LoggerMiddleware],
})
export class LoggerModule {}
