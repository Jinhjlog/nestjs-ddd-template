import { Injectable } from '@nestjs/common';
import { BoundedString, Password } from '@lib/domain';
import {
  AuthenticationException,
  AuthorizationException,
} from '@shared/exception';
import { AdminRepository } from '../../domain/repositories/admin.repository';
import { AdminAuthService } from '../../domain/services/admin-auth.service';

export interface LoginDto {
  loginId: string;
  password: string;
  /** 클라이언트 IP (req.ip 또는 X-Forwarded-For) */
  ipAddress: string;
  /** User-Agent 원본 문자열 */
  userAgent?: string;
}

@Injectable()
export class AdminLoginUseCase {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  async execute(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const loginId = BoundedString.create(dto.loginId, {
      fieldName: 'loginId',
      maxLength: 20,
    });

    const admin = await this.adminRepository.findByLoginId(loginId);

    if (!admin) {
      throw new AuthenticationException({
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const inputPassword = await Password.create(dto.password, false);
    const isPasswordValid = await admin.password.comparePassword(inputPassword);
    if (!isPasswordValid) {
      throw new AuthenticationException({
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    if (!admin.isActive) {
      throw new AuthorizationException({
        message: '비활성화된 관리자 계정입니다.',
        errorCode: 'ADMIN_ACCOUNT_INACTIVE',
      });
    }

    const tokens = await this.adminAuthService.issueTokens(admin);

    admin.updateLastLoginAt();
    await this.adminRepository.save(admin);

    return tokens;
  }
}
