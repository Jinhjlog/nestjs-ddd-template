import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '@shared/exception';
import { UserQueryService } from '../../domain/services/user-query.service';
import { UserAdminDetailReadModel } from '../../domain/models/user/user-admin-detail.read-model';

@Injectable()
export class FindAdminUserDetailUseCase {
  constructor(private readonly userQueryService: UserQueryService) {}

  async execute(id: string): Promise<UserAdminDetailReadModel> {
    const detail = await this.userQueryService.findAdminDetailById(id);
    if (!detail) {
      throw new EntityNotFoundException({
        id,
        entityName: 'User',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return detail;
  }
}
