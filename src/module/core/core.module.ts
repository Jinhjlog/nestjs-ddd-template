import { Global, Module } from '@nestjs/common';
import environmentConfig from './config/environment.config';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from './logger';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [environmentConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      isGlobal: true,
    }),
    LoggerModule,
    DatabaseModule,
  ],
  providers: [ConfigService],
  exports: [ConfigService, DatabaseModule],
})
export class CoreModule {}
