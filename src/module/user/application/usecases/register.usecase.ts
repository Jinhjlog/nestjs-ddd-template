import { Injectable } from '@nestjs/common';
import { BoundedString, Email, Password, Phone } from '@lib/domain';
import { DuplicateEntityException } from '@shared/exception';
import { UserRepository } from '../../domain/repositories';
import { UserAuthService } from '../../domain/services';
import { User } from '../../domain/models/user';
import type { RegisterDto } from '../dtos/register.dto';
import type { RegisterResult } from '../dtos/register.result';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userAuthService: UserAuthService,
  ) {}

  async execute(dto: RegisterDto): Promise<RegisterResult> {
    const email = Email.create(dto.email);
    const password = await Password.create(dto.password, true);
    const name = dto.name
      ? BoundedString.create(dto.name, { fieldName: 'name', maxLength: 30 })
      : undefined;
    const phone = dto.phone ? Phone.create(dto.phone) : undefined;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new DuplicateEntityException({
        entityName: 'User',
        errorCode: 'EMAIL_ALREADY_EXISTS',
      });
    }

    const user = User.create({ email, password, name, phone });
    await this.userRepository.save(user);

    const tokens = await this.userAuthService.issueTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
