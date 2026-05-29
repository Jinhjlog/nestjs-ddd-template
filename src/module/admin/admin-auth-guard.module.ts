import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@core/jwt/jwt.module';
import type { EnvironmentConfig } from '@core/config/environment.config';
import { ADMIN_JWT } from './admin-auth.tokens';
import { AdminRepository } from './domain/repositories/admin.repository';
import { AdminRepositoryImpl } from './infra/repositories/admin.repository.impl';
import { AdminJwtGuard } from './presentation/guards';
import { AdminRoleGuard } from './presentation/guards';

@Global()
@Module({
  imports: [
    JwtModule.forContext(ADMIN_JWT, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig, true>) => ({
        accessSecret: config.get('adminJwt.accessSecret', { infer: true }),
        accessTokenExpiresIn: config.get('adminJwt.accessTokenExpiresIn', {
          infer: true,
        }),
        issuer: 'app-admin',
      }),
    }),
  ],
  providers: [
    {
      provide: AdminRepository,
      useClass: AdminRepositoryImpl,
    },
    AdminJwtGuard,
    AdminRoleGuard,
  ],
  exports: [AdminJwtGuard, AdminRoleGuard, JwtModule, AdminRepository],
})
export class AdminAuthGuardModule {}
