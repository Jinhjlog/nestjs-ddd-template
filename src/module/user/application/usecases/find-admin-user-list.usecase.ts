import { Injectable } from '@nestjs/common';
import { UserQueryService } from '../../domain/services/user-query.service';
import { UserAdminListItemReadModel } from '../../domain/models/user/user-admin-list.read-model';

export interface FindAdminUserListDto {
  name?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class FindAdminUserListUseCase {
  constructor(private readonly userQueryService: UserQueryService) {}

  async execute(dto: FindAdminUserListDto): Promise<{
    items: UserAdminListItemReadModel[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const page = dto.page ?? 1;
    const skip = (page - 1) * dto.limit;

    const [items, totalCount] = await Promise.all([
      this.userQueryService.findAdminList({
        skip,
        limit: dto.limit,
        name: dto.name,
        isActive: dto.isActive,
      }),
      this.userQueryService.countAdminList({
        name: dto.name,
        isActive: dto.isActive,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / dto.limit) || 1;

    return { items, totalCount, totalPages, currentPage: page };
  }
}
