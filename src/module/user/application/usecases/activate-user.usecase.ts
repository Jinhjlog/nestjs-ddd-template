import { Injectable } from '@nestjs/common';
import {
  DomainRuleViolationException,
  EntityNotFoundException,
} from '@shared/exception';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserPrimitives } from '../../domain/models/user/user';

@Injectable()
export class ActivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<UserPrimitives> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException({
        id: userId,
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    if (user.isActive) {
      throw new DomainRuleViolationException({
        entityName: 'User',
        reason: '이미 활성화된 사용자입니다.',
        errorCode: 'USER_ALREADY_ACTIVATED',
      });
    }

    user.activate();
    await this.userRepository.save(user);

    return user.toPrimitives();
  }
}
