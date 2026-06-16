import { Injectable } from '@nestjs/common';
import { Email, Password } from '@lib/domain';
import {
  AuthenticationException,
  AuthorizationException,
} from '@shared/exception';
import { UserRepository } from '../../domain/repositories';
import { UserAuthService } from '../../domain/services';

export interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userAuthService: UserAuthService,
  ) {}

  async execute(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const email = Email.create(dto.email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationException({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const inputPassword = await Password.create(dto.password, false);
    const isValid = await user.password.comparePassword(inputPassword);
    if (!isValid) {
      throw new AuthenticationException({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      throw new AuthorizationException({
        message: '비활성화된 계정입니다.',
        errorCode: 'USER_ACCOUNT_INACTIVE',
      });
    }

    const tokens = await this.userAuthService.issueTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
