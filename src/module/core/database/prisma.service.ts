import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { EnvironmentConfig } from '@core/config/environment.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService<EnvironmentConfig, true>) {
    const dbConfig =
      configService.get<EnvironmentConfig['database']>('database');

    const adapter = new PrismaMariaDb({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.name,
      connectionLimit: dbConfig.connectionLimit,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    // 실제 쿼리를 날려서 DB 연결 확인
    await this.$queryRaw`SELECT 1 as test`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
