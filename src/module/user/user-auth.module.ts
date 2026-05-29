import { Module, Provider } from '@nestjs/common';
import {
  LoginUseCase,
  RegisterUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
} from './application/usecases';
import { UserAuthService } from './domain/services';
import { UserRepository } from './domain/repositories/user.repository';
import { UserRepositoryImpl } from './infra/repositories/user.repository.impl';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { RefreshTokenRepositoryImpl } from './infra/repositories/refresh-token.repository.impl';
import { ExpiredRefreshTokenCleanupScheduler } from './infra/schedulers/expired-refresh-token-cleanup.scheduler';
import { UserAuthController } from './presentation/controllers/user-auth.controller';

const useCases: Provider[] = [
  LoginUseCase,
  RegisterUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
];

@Module({
  imports: [],
  controllers: [UserAuthController],
  providers: [
    ...useCases,
    UserAuthService,
    {
      provide: UserRepository,
      useClass: UserRepositoryImpl,
    },
    {
      provide: RefreshTokenRepository,
      useClass: RefreshTokenRepositoryImpl,
    },
    ExpiredRefreshTokenCleanupScheduler,
  ],
})
export class UserAuthModule {}
