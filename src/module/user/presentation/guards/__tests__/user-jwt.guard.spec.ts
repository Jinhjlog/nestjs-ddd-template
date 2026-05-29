import * as jwt from 'jsonwebtoken';
import { ExecutionContext } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserJwtGuard } from '../user-jwt.guard';
import { JwtCoreService } from '@core/jwt/jwt-core.service';
import { AuthResultStatus, type JwtModuleOptions } from '@core/jwt/interfaces';
import { AuthenticationException } from '@shared/exception';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/models/user';
import { Email, Password, BoundedString, Phone } from '@lib/domain';

describe('UserJwtGuard', () => {
  const defaultOptions: JwtModuleOptions = {
    accessSecret: 'test-access-secret',
    accessTokenExpiresIn: 3600,
    issuer: 'test-user',
  };

  let userRepository: MockProxy<UserRepository>;

  beforeEach(() => {
    userRepository = mock<UserRepository>();
  });

  function createJwtService(overrides?: Partial<JwtModuleOptions>) {
    return new JwtCoreService({ ...defaultOptions, ...overrides });
  }

  function createGuard(options?: Partial<JwtModuleOptions>) {
    return new UserJwtGuard(createJwtService(options), userRepository);
  }

  function createValidToken(
    payload: Record<string, any> = { userId: 'user-123' },
  ): string {
    const service = createJwtService();
    const result = service.createAccessToken(payload);
    if (result.status !== AuthResultStatus.SUCCESS) {
      throw new Error('토큰 생성 실패');
    }
    return result.data;
  }

  function createUser(overrides?: { isActive?: boolean }): User {
    return User.unsafeCreate({
      id: 'user-123',
      email: Email.unsafeCreate('test@example.com'),
      password: Password.unsafeCreate('$2b$10$hashedpassword'),
      name: BoundedString.unsafeCreate('테스트유저'),
      phone: Phone.unsafeCreate('01012345678'),
      isActive: overrides?.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  interface MockRequest {
    headers: Record<string, string>;
    user?: Record<string, any>;
  }

  function createMockContext(authHeader?: string): {
    ctx: ExecutionContext;
    request: MockRequest;
  } {
    const request: MockRequest = {
      headers: {
        ...(authHeader !== undefined && { authorization: authHeader }),
      },
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { ctx, request };
  }

  describe('토큰이 없는 경우', () => {
    it('Authorization 헤더가 없으면 AuthenticationException을 던진다', async () => {
      const guard = createGuard();
      const { ctx } = createMockContext();

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('Bearer 스킴이 아니면 AuthenticationException을 던진다', async () => {
      const guard = createGuard();
      const { ctx } = createMockContext('Basic abc123');

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('Bearer 뒤에 토큰이 없으면 AuthenticationException을 던진다', async () => {
      const guard = createGuard();
      const { ctx } = createMockContext('Bearer ');

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });
  });

  describe('유효한 토큰 + DB 조회', () => {
    it('유효한 토큰이고 활성 사용자이면 true를 반환하고 request.user에 AuthenticatedUser를 주입한다', async () => {
      userRepository.findById.mockResolvedValue(createUser());
      const guard = createGuard();
      const token = createValidToken();
      const { ctx, request } = createMockContext(`Bearer ${token}`);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: '테스트유저',
        phone: '01012345678',
      });
    });

    it('유효한 토큰이지만 DB에 사용자가 없으면 AuthenticationException을 던진다', async () => {
      userRepository.findById.mockResolvedValue(undefined);
      const guard = createGuard();
      const token = createValidToken();
      const { ctx } = createMockContext(`Bearer ${token}`);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('유효한 토큰이지만 비활성 사용자이면 AuthenticationException을 던진다', async () => {
      userRepository.findById.mockResolvedValue(
        createUser({ isActive: false }),
      );
      const guard = createGuard();
      const token = createValidToken();
      const { ctx } = createMockContext(`Bearer ${token}`);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });
  });

  describe('유효하지 않은 토큰', () => {
    it('만료된 토큰이면 AuthenticationException을 던진다', async () => {
      const token = jwt.sign(
        { payload: { userId: '123' } },
        defaultOptions.accessSecret,
        {
          algorithm: 'HS256',
          expiresIn: -1,
          issuer: defaultOptions.issuer,
        },
      );

      const guard = createGuard();
      const { ctx } = createMockContext(`Bearer ${token}`);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('잘못된 시크릿으로 서명된 토큰이면 AuthenticationException을 던진다', async () => {
      const token = jwt.sign({ payload: { userId: '123' } }, 'wrong-secret', {
        algorithm: 'HS256',
        expiresIn: 3600,
        issuer: defaultOptions.issuer,
      });

      const guard = createGuard();
      const { ctx } = createMockContext(`Bearer ${token}`);

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        AuthenticationException,
      );
    });
  });
});
