import { ExecutionContext } from '@nestjs/common';
import { currentUserFactory } from '../current-user.decorator';
import type { AuthenticatedUser } from '../../guards';

describe('CurrentUser', () => {
  const mockUser: AuthenticatedUser = {
    userId: 'user-123',
    email: 'test@example.com',
    name: '테스트유저',
    phone: '01012345678',
  };

  function createMockContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;
  }

  it('data가 없으면 전체 AuthenticatedUser를 반환한다', () => {
    const result = currentUserFactory(undefined, createMockContext());

    expect(result).toEqual(mockUser);
  });

  it('data가 "userId"이면 userId만 반환한다', () => {
    const result = currentUserFactory('userId', createMockContext());

    expect(result).toBe('user-123');
  });

  it('data가 "email"이면 email만 반환한다', () => {
    const result = currentUserFactory('email', createMockContext());

    expect(result).toBe('test@example.com');
  });

  it('data가 "name"이면 name만 반환한다', () => {
    const result = currentUserFactory('name', createMockContext());

    expect(result).toBe('테스트유저');
  });

  it('data가 "phone"이면 phone만 반환한다', () => {
    const result = currentUserFactory('phone', createMockContext());

    expect(result).toBe('01012345678');
  });
});
