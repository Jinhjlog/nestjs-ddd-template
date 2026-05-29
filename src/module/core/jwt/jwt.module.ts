/**
 * JWT 동적 모듈 — 액세스 토큰 전용 (sign / verify)
 *
 * 각 인증 컨텍스트(user-auth, admin-auth 등)가 독립된 시크릿과
 * JwtCoreService 인스턴스를 갖도록 `forContext()`로 등록합니다.
 * 리프레시 토큰은 JWT가 아닌 DB 기반이므로 이 모듈의 범위 밖입니다.
 *
 * ─── 사용법 ───
 *
 * 1) 컨텍스트 토큰 정의 (모듈 또는 별도 파일)
 *
 *    export const USER_JWT = Symbol('USER_JWT');
 *
 * 2) 모듈에 등록
 *
 *    @Module({
 *      imports: [
 *        JwtModule.forContext(USER_JWT, {
 *          imports: [ConfigModule],
 *          inject:  [ConfigService],
 *          useFactory: (config: ConfigService) => ({
 *            accessSecret:        config.get('jwt.accessSecret'),
 *            accessTokenExpiresIn: config.get('jwt.accessTokenExpiresIn'),
 *            issuer: 'app-user',  // optional
 *          }),
 *        }),
 *      ],
 *    })
 *    export class UserAuthModule {}
 *
 * 3) 서비스에서 주입
 *
 *    @Injectable()
 *    export class UserAuthService {
 *      constructor(
 *        @Inject(USER_JWT) private readonly jwt: JwtCoreService,
 *      ) {}
 *
 *      login(payload: CustomTokenPayload) {
 *        const result = this.jwt.createAccessToken(payload);
 *        // result.status === AuthResultStatus.SUCCESS → result.data (string)
 *      }
 *
 *      verify(token: string) {
 *        const result = this.jwt.verifyAccessToken(token);
 *        // SUCCESS → result.data (TokenPayload)
 *        // ACCESS_TOKEN_EXPIRED | INVALID_ACCESS_TOKEN | INFRASTRUCTURE_ERROR
 *      }
 *    }
 */
import { DynamicModule, Module } from '@nestjs/common';
import { JwtModuleAsyncOptions } from './interfaces';
import { JwtCoreService } from './jwt-core.service';
import { JWT_MODULE_OPTIONS } from './jwt.constants';

@Module({})
export class JwtModule {
  static forContext(
    contextToken: symbol,
    asyncOptions: JwtModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: JwtModule,
      imports: asyncOptions.imports || [],
      providers: [
        {
          provide: JWT_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject || [],
        },
        JwtCoreService,
        {
          provide: contextToken,
          useExisting: JwtCoreService,
        },
      ],
      exports: [contextToken],
    };
  }
}
