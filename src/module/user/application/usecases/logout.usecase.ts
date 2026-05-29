import { Injectable } from '@nestjs/common';
import { UserAuthService } from '../../domain/services';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly userAuthService: UserAuthService) {}

  async execute(refreshToken: string): Promise<void> {
    await this.userAuthService.logout(refreshToken);
  }
}
