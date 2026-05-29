import { AggregateRoot, UniqueEntityId } from '@lib/domain';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export interface AdminRefreshTokenProps {
  id?: string;
  adminId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class AdminRefreshToken extends AggregateRoot<AdminRefreshTokenProps> {
  private static BCRYPT_SALT_ROUNDS = 10;
  private static EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7일

  private _rawToken?: string;

  private constructor(props: AdminRefreshTokenProps, rawToken?: string) {
    super(props, new UniqueEntityId(props.id));
    this._rawToken = rawToken;
  }

  get rawToken(): string | undefined {
    return this._rawToken;
  }

  get adminId(): string {
    return this.props.adminId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** 토큰 만료 여부 확인 */
  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  /** 원본 토큰과 해시 비교 */
  async verifyToken(rawToken: string): Promise<boolean> {
    return bcrypt.compare(rawToken, this.props.tokenHash);
  }

  /** 새로운 리프레시 토큰 발급 */
  static async issue(
    props: Pick<AdminRefreshTokenProps, 'adminId'>,
  ): Promise<AdminRefreshToken> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, this.BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.EXPIRES_IN_SECONDS * 1000);

    return new AdminRefreshToken(
      { ...props, tokenHash, expiresAt, createdAt: new Date() },
      rawToken,
    );
  }

  /**
   * DB에서 복원합니다 (Mapper 전용, 검증 없음).
   */
  static unsafeCreate(props: AdminRefreshTokenProps): AdminRefreshToken {
    return new AdminRefreshToken(props);
  }
}
