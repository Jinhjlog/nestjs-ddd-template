import { RefreshToken } from '../refresh-token';

describe('RefreshToken', () => {
  describe('issue', () => {
    it('RefreshToken 인스턴스를 생성한다', async () => {
      const token = await RefreshToken.issue({
        userId: 'user-123',
      });

      expect(token).toBeInstanceOf(RefreshToken);
    });
  });

  describe('isExpired', () => {
    it('만료되지 않은 토큰은 false를 반환한다', async () => {
      const token = await RefreshToken.issue({
        userId: 'user-123',
      });

      expect(token.isExpired()).toBe(false);
    });

    it('만료된 토큰은 true를 반환한다', () => {
      const token = RefreshToken.unsafeCreate({
        id: 'token-1',
        userId: 'user-123',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });

      expect(token.isExpired()).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('올바른 rawToken으로 검증하면 true를 반환한다', async () => {
      const token = await RefreshToken.issue({
        userId: 'user-123',
      });

      const result = await token.verifyToken(token.rawToken!);
      expect(result).toBe(true);
    });

    it('잘못된 rawToken으로 검증하면 false를 반환한다', async () => {
      const token = await RefreshToken.issue({
        userId: 'user-123',
      });

      const result = await token.verifyToken('wrong-token');
      expect(result).toBe(false);
    });
  });
});
