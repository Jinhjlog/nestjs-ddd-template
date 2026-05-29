import { Injectable } from '@nestjs/common';
import { AdminAuthService } from '../../domain/services/admin-auth.service';
import type { RefreshTokenDto } from '../dtos/refresh-token.dto';
import type { RefreshTokenResult } from '../dtos/refresh-token.result';

@Injectable()
export class AdminRefreshTokenUseCase {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async execute(dto: RefreshTokenDto): Promise<RefreshTokenResult> {
    return this.adminAuthService.refreshTokens(dto.refreshToken);
  }
}
