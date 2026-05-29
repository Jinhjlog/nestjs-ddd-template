import { Injectable } from '@nestjs/common';
import { AdminAuthService } from '../../domain/services/admin-auth.service';
import type { LogoutDto } from '../dtos/logout.dto';

@Injectable()
export class AdminLogoutUseCase {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async execute(dto: LogoutDto): Promise<void> {
    await this.adminAuthService.logout(dto.refreshToken);
  }
}
