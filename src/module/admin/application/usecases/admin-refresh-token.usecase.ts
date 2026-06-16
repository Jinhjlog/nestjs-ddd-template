import { Injectable } from '@nestjs/common';
import { AdminAuthService } from '../../domain/services/admin-auth.service';

export interface RefreshTokenDto {
  refreshToken: string;
}

@Injectable()
export class AdminRefreshTokenUseCase {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async execute(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.adminAuthService.refreshTokens(dto.refreshToken);
  }
}
