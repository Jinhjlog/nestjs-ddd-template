import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@core/jwt/jwt.module';
import type { EnvironmentConfig } from '@core/config/environment.config';
import { USER_JWT } from './user-auth.tokens';
import { UserRepository } from './domain/repositories/user.repository';
import { UserRepositoryImpl } from './infra/repositories/user.repository.impl';
import { UserJwtGuard } from './presentation/guards';

@Global()
@Module({
  imports: [
    JwtModule.forContext(USER_JWT, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentConfig, true>) => ({
        accessSecret: config.get('jwt.accessSecret', { infer: true }),
        accessTokenExpiresIn: config.get('jwt.accessTokenExpiresIn', {
          infer: true,
        }),
        issuer: 'app-user',
      }),
    }),
  ],
  providers: [
    {
      provide: UserRepository,
      useClass: UserRepositoryImpl,
    },
    UserJwtGuard,
  ],
  exports: [UserJwtGuard, JwtModule, UserRepository],
})
export class UserAuthGuardModule {}
