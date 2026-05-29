import * as jwt from 'jsonwebtoken';
import { JwtCoreService } from '../jwt-core.service';
import {
  AuthResultStatus,
  type JwtModuleOptions,
  type TokenPayload,
} from '../interfaces';

describe('JwtCoreService', () => {
  const defaultOptions: JwtModuleOptions = {
    accessSecret: 'test-access-secret',
    accessTokenExpiresIn: 3600,
  };

  function createService(overrides?: Partial<JwtModuleOptions>) {
    return new JwtCoreService({ ...defaultOptions, ...overrides });
  }

  describe('createAccessToken', () => {
    it('액세스 토큰을 생성한다', () => {
      const service = createService();
      const result = service.createAccessToken({ userId: '123' });

      expect(result.status).toBe(AuthResultStatus.SUCCESS);
      if (result.status !== AuthResultStatus.SUCCESS) return;

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
    });

    it('생성된 토큰은 accessSecret으로 검증 가능하다', () => {
      const service = createService();
      const result = service.createAccessToken({ userId: '123' });

      if (result.status !== AuthResultStatus.SUCCESS) return;

      const decoded = jwt.verify(
        result.data,
        defaultOptions.accessSecret,
      ) as TokenPayload;
      expect(decoded.payload.userId).toBe('123');
    });

    it('issuer가 설정된 경우 토큰에 포함된다', () => {
      const service = createService({ issuer: 'app' });
      const result = service.createAccessToken({ userId: '123' });

      if (result.status !== AuthResultStatus.SUCCESS) return;

      const decoded = jwt.decode(result.data) as TokenPayload;
      expect(decoded.iss).toBe('app');
    });
  });

  describe('verifyAccessToken', () => {
    it('유효한 accessToken을 검증한다', () => {
      const service = createService();
      const token = jwt.sign(
        { payload: { userId: '123' } },
        defaultOptions.accessSecret,
        { algorithm: 'HS256', expiresIn: 3600 },
      );

      const result = service.verifyAccessToken(token);

      expect(result.status).toBe(AuthResultStatus.SUCCESS);
      if (result.status !== AuthResultStatus.SUCCESS) return;
      expect(result.data.payload.userId).toBe('123');
    });

    it('만료된 accessToken은 ACCESS_TOKEN_EXPIRED를 반환한다', () => {
      const service = createService();
      const token = jwt.sign(
        { payload: { userId: '123' } },
        defaultOptions.accessSecret,
        { algorithm: 'HS256', expiresIn: -1 },
      );

      const result = service.verifyAccessToken(token);

      expect(result.status).toBe(AuthResultStatus.ACCESS_TOKEN_EXPIRED);
    });

    it('잘못된 시크릿으로 서명된 토큰은 INVALID_ACCESS_TOKEN을 반환한다', () => {
      const service = createService();
      const token = jwt.sign({ payload: { userId: '123' } }, 'wrong-secret', {
        algorithm: 'HS256',
        expiresIn: 3600,
      });

      const result = service.verifyAccessToken(token);

      expect(result.status).toBe(AuthResultStatus.INVALID_ACCESS_TOKEN);
    });

    it('issuer가 다른 토큰은 INVALID_ACCESS_TOKEN을 반환한다', () => {
      const service = createService({ issuer: 'app' });
      const token = jwt.sign(
        { payload: { userId: '123' } },
        defaultOptions.accessSecret,
        { algorithm: 'HS256', expiresIn: 3600, issuer: 'other-issuer' },
      );

      const result = service.verifyAccessToken(token);

      expect(result.status).toBe(AuthResultStatus.INVALID_ACCESS_TOKEN);
    });
  });

  describe('createAccessToken → verifyAccessToken 라운드트립', () => {
    it('생성한 토큰을 검증할 수 있다', () => {
      const service = createService();
      const payload = { userId: 'round-trip', role: 'ADMIN' };
      const createResult = service.createAccessToken(payload);

      if (createResult.status !== AuthResultStatus.SUCCESS) {
        throw new Error('토큰 생성 실패');
      }

      const verifyResult = service.verifyAccessToken(createResult.data);

      expect(verifyResult.status).toBe(AuthResultStatus.SUCCESS);
      if (verifyResult.status === AuthResultStatus.SUCCESS) {
        expect(verifyResult.data.payload).toEqual(payload);
      }
    });
  });
});
