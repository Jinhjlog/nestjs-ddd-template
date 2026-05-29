import { Injectable } from '@nestjs/common';
import { UserQueryService } from '../../domain/services/user-query.service';
import { UserProfileReadModel } from '../../domain/models/user/user-profile.read-model';
import { EntityNotFoundException } from '@shared/exception';

@Injectable()
export class GetMyProfileUseCase {
  constructor(private readonly userQueryService: UserQueryService) {}

  async execute(userId: string): Promise<UserProfileReadModel> {
    const profile = await this.userQueryService.findProfileById(userId);
    if (!profile) {
      throw new EntityNotFoundException({
        id: userId,
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return profile;
  }
}
