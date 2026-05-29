import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionsFilter } from '@shared/exception';
import { LoggerMiddleware } from '@core/logger';
import { CoreModule } from '@core/core.module';
import { HealthModule } from './health/health.module';
import { AdminAuthGuardModule } from './admin/admin-auth-guard.module';
import { AdminAuthModule } from './admin/admin-auth.module';
import { AdminModule } from './admin/admin.module';
import { UserAuthGuardModule } from './user/user-auth-guard.module';
import { UserAuthModule } from './user/user-auth.module';
import { UserModule } from './user/user.module';
import { FileUploadModule } from './file-upload/file-upload.module';

@Module({
  imports: [
    // Infrastructure
    CoreModule,
    HealthModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 10 },
        { name: 'long', ttl: 60000, limit: 100 },
      ],
    }),

    // Auth
    AdminAuthGuardModule,
    AdminAuthModule,
    AdminModule,
    UserAuthGuardModule,
    UserAuthModule,
    UserModule,

    // Feature
    FileUploadModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
