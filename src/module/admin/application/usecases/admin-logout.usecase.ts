import { Injectable } from '@nestjs/common';
import { AdminAuthService } from '../../domain/services/admin-auth.service';

export interface LogoutDto {
  refreshToken: string;
}

@Injectable()
export class AdminLogoutUseCase {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async execute(dto: LogoutDto): Promise<void> {
    await this.adminAuthService.logout(dto.refreshToken);
  }
}
