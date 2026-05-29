import { AggregateRoot, UniqueEntityId } from '@lib/domain';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export interface RefreshTokenProps {
  id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshToken extends AggregateRoot<RefreshTokenProps> {
  private static BCRYPT_SALT_ROUNDS = 10;
  private static EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7일

  private _rawToken?: string;

  private constructor(props: RefreshTokenProps, rawToken?: string) {
    super(props, new UniqueEntityId(props.id));
    this._rawToken = rawToken;
  }

  get rawToken(): string | undefined {
    return this._rawToken;
  }

  get userId(): string {
    return this.props.userId;
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

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  async verifyToken(rawToken: string): Promise<boolean> {
    return bcrypt.compare(rawToken, this.props.tokenHash);
  }

  static async issue(
    props: Pick<RefreshTokenProps, 'userId'>,
  ): Promise<RefreshToken> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, this.BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.EXPIRES_IN_SECONDS * 1000);

    return new RefreshToken(
      { ...props, tokenHash, expiresAt, createdAt: new Date() },
      rawToken,
    );
  }

  static unsafeCreate(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }
}
