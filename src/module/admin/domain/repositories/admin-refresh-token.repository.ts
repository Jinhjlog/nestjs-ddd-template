import { AdminRefreshToken } from '../models';

export abstract class AdminRefreshTokenRepository {
  abstract create(token: AdminRefreshToken): Promise<void>;
  abstract findById(id: string): Promise<AdminRefreshToken | undefined>;
  abstract deleteByAdminId(adminId: string): Promise<void>;
  abstract deleteByIdIfExists(id: string): Promise<void>;
  abstract deleteExpired(): Promise<number>;
}
