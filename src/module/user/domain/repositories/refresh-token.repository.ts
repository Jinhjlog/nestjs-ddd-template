import { RefreshToken } from '../models/refresh-token';

export abstract class RefreshTokenRepository {
  abstract create(refreshToken: RefreshToken): Promise<void>;
  abstract findById(id: string): Promise<RefreshToken | undefined>;
  abstract deleteById(id: string): Promise<void>;
  abstract deleteByIdIfExists(id: string): Promise<void>;
  abstract deleteExpired(): Promise<number>;
}
