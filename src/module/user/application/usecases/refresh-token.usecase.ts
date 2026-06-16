import { Injectable } from '@nestjs/common';
import { UserAuthService } from '../../domain/services';

export interface RefreshTokenDto {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly userAuthService: UserAuthService) {}

  async execute(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.userAuthService.refreshTokens(dto.refreshToken);
  }
}
