import { BadRequestException } from '@nestjs/common';
import { CursorUtil } from './cursor.util';

describe('CursorUtil', () => {
  describe('isValidUlid', () => {
    it('유효한 ULID를 검증합니다.', () => {
      expect(CursorUtil.isValidUlid('01K8AK2Y81AKXPNZHT3YYVRYPD')).toBe(true);
    });

    it('잘못된 형식은 false를 반환합니다.', () => {
      expect(CursorUtil.isValidUlid('invalid-id')).toBe(false);
      expect(CursorUtil.isValidUlid('')).toBe(false);
    });
  });

  describe('encode', () => {
    it('단일 엔티티 커서를 Base64로 인코딩합니다.', () => {
      const data = {
        id: '01K8AK2Y81AKXPNZHT3YYVRYPD',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      const encoded = CursorUtil.encode(data);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('복합 커서를 Base64로 인코딩합니다.', () => {
      const data = {
        userId: '01K8AK2Y81AKXPNZHT3YYVRYPD',
        postId: '01KJ4KGT1PPJXM2SME1W6XGJQM',
      };

      const encoded = CursorUtil.encode(data);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('decode', () => {
    it('단일 엔티티 커서를 디코딩합니다.', () => {
      const original = {
        id: '01K8AK2Y81AKXPNZHT3YYVRYPD',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };
      const encoded = CursorUtil.encode(original);

      const decoded = CursorUtil.decode<{ id: string; createdAt: string }>(
        encoded,
        ['id', 'createdAt'],
      );

      expect(decoded.id).toBe(original.id);
      expect(decoded.createdAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('복합 커서를 디코딩합니다.', () => {
      const original = {
        userId: '01K8AK2Y81AKXPNZHT3YYVRYPD',
        postId: '01KJ4KGT1PPJXM2SME1W6XGJQM',
      };
      const encoded = CursorUtil.encode(original);

      const decoded = CursorUtil.decode<{
        userId: string;
        postId: string;
      }>(encoded, ['userId', 'postId']);

      expect(decoded.userId).toBe(original.userId);
      expect(decoded.postId).toBe(original.postId);
    });

    it('필수 키가 없으면 예외를 발생시킵니다.', () => {
      const data = { userId: '01K8AK2Y81AKXPNZHT3YYVRYPD' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64');

      expect(() => CursorUtil.decode(encoded, ['userId', 'postId'])).toThrow(
        new BadRequestException('INVALID_CURSOR'),
      );
    });

    it('잘못된 Base64 문자열은 예외를 발생시킵니다.', () => {
      expect(() => CursorUtil.decode('invalid!!!', ['id'])).toThrow(
        new BadRequestException('INVALID_CURSOR'),
      );
    });

    it('빈 문자열은 예외를 발생시킵니다.', () => {
      expect(() => CursorUtil.decode('', ['id'])).toThrow(
        new BadRequestException('INVALID_CURSOR'),
      );
    });

    it('빈 객체는 필수 키 검증에 실패합니다.', () => {
      const encoded = Buffer.from(JSON.stringify({})).toString('base64');

      expect(() => CursorUtil.decode(encoded, ['id'])).toThrow(
        new BadRequestException('INVALID_CURSOR'),
      );
    });
  });

  describe('encode → decode 왕복 테스트', () => {
    it('인코딩 후 디코딩하면 원본 데이터와 동일합니다.', () => {
      const original = {
        userId: '01K8AK2Y81AKXPNZHT3YYVRYPD',
        postId: '01KJ4KGT1PPJXM2SME1W6XGJQM',
      };

      const encoded = CursorUtil.encode(original);
      const decoded = CursorUtil.decode<{
        userId: string;
        postId: string;
      }>(encoded, ['userId', 'postId']);

      expect(decoded.userId).toBe(original.userId);
      expect(decoded.postId).toBe(original.postId);
    });
  });
});
