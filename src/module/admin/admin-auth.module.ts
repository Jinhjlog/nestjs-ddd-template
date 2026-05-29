import { Module, Provider } from '@nestjs/common';
import {
  AdminLoginUseCase,
  AdminLogoutUseCase,
  AdminRefreshTokenUseCase,
} from './application/usecases';
import { AdminAuthService } from './domain/services';
import { AdminRefreshTokenRepository } from './domain/repositories/admin-refresh-token.repository';
import { AdminRefreshTokenRepositoryImpl } from './infra/repositories/admin-refresh-token.repository.impl';
import { ExpiredAdminRefreshTokenCleanupScheduler } from './infra/schedulers/expired-admin-refresh-token-cleanup.scheduler';
import { AdminAuthController } from './presentation/controllers/admin-auth.controller';

const useCases: Provider[] = [
  AdminLoginUseCase,
  AdminRefreshTokenUseCase,
  AdminLogoutUseCase,
];

@Module({
  imports: [],
  controllers: [AdminAuthController],
  providers: [
    ...useCases,
    AdminAuthService,
    {
      provide: AdminRefreshTokenRepository,
      useClass: AdminRefreshTokenRepositoryImpl,
    },
    ExpiredAdminRefreshTokenCleanupScheduler,
  ],
})
export class AdminAuthModule {}
