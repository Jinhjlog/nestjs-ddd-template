import { Test } from '@nestjs/testing';
import { JwtModule } from '../jwt.module';
import { JwtCoreService } from '../jwt-core.service';
import { AuthResultStatus, type JwtModuleOptions } from '../interfaces';

const USER_JWT = Symbol('USER_JWT');
const ADMIN_JWT = Symbol('ADMIN_JWT');

const userOptions: JwtModuleOptions = {
  accessSecret: 'user-access-secret',
  accessTokenExpiresIn: 3600,
  issuer: 'app-user',
};

const adminOptions: JwtModuleOptions = {
  accessSecret: 'admin-access-secret',
  accessTokenExpiresIn: 1800,
  issuer: 'app-admin',
};

describe('JwtModule.forContext', () => {
  it('contextToken으로 JwtCoreService 인스턴스를 주입받을 수 있다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.forContext(USER_JWT, {
          useFactory: () => userOptions,
        }),
      ],
    }).compile();

    const jwtService = moduleRef.get<JwtCoreService>(USER_JWT);
    expect(jwtService).toBeInstanceOf(JwtCoreService);
  });

  it('서로 다른 contextToken으로 독립된 인스턴스를 생성한다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.forContext(USER_JWT, {
          useFactory: () => userOptions,
        }),
        JwtModule.forContext(ADMIN_JWT, {
          useFactory: () => adminOptions,
        }),
      ],
    }).compile();

    const userJwt = moduleRef.get<JwtCoreService>(USER_JWT);
    const adminJwt = moduleRef.get<JwtCoreService>(ADMIN_JWT);

    expect(userJwt).toBeInstanceOf(JwtCoreService);
    expect(adminJwt).toBeInstanceOf(JwtCoreService);
    expect(userJwt).not.toBe(adminJwt);
  });

  it('각 컨텍스트의 토큰은 교차 검증되지 않는다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.forContext(USER_JWT, {
          useFactory: () => userOptions,
        }),
        JwtModule.forContext(ADMIN_JWT, {
          useFactory: () => adminOptions,
        }),
      ],
    }).compile();

    const userJwt = moduleRef.get<JwtCoreService>(USER_JWT);
    const adminJwt = moduleRef.get<JwtCoreService>(ADMIN_JWT);

    const userToken = userJwt.createAccessToken({ userId: 'u1' });
    if (userToken.status !== AuthResultStatus.SUCCESS) {
      throw new Error('토큰 생성 실패');
    }

    // user 컨텍스트의 토큰은 admin 컨텍스트에서 검증 실패
    const crossResult = adminJwt.verifyAccessToken(userToken.data);
    expect(crossResult.status).toBe(AuthResultStatus.INVALID_ACCESS_TOKEN);

    // user 컨텍스트의 토큰은 자신의 컨텍스트에서 검증 성공
    const selfResult = userJwt.verifyAccessToken(userToken.data);
    expect(selfResult.status).toBe(AuthResultStatus.SUCCESS);
  });
});
