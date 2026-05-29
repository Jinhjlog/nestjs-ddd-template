import { Injectable } from '@nestjs/common';
import { UserAuthService } from '../../domain/services';
import type { RefreshTokenDto } from '../dtos/refresh-token.dto';
import type { RefreshTokenResult } from '../dtos/refresh-token.result';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly userAuthService: UserAuthService) {}

  async execute(dto: RefreshTokenDto): Promise<RefreshTokenResult> {
    return this.userAuthService.refreshTokens(dto.refreshToken);
  }
}
