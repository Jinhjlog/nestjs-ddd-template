import { AdminUserListResult } from '../../application/usecases/find-admin-user-list.usecase';
import {
  AdminUserListResponseDto,
  AdminUserListItemResponseDto,
} from '../dtos/response/admin-user-list.response.dto';
import { UserAdminDetailReadModel } from '../../domain/models/user/user-admin-detail.read-model';
import { AdminUserDetailResponseDto } from '../dtos/response/admin-user-detail.response.dto';

export class AdminUserTransformer {
  static toListResponse(result: AdminUserListResult): AdminUserListResponseDto {
    const items: AdminUserListItemResponseDto[] = result.items.map((item) => ({
      id: item.id,
      name: item.name !== undefined ? item.name : null,
      email: item.email,
      phone: item.phone !== undefined ? item.phone : null,
      isActive: item.isActive,
      createdAt: item.createdAt,
    }));

    return {
      items,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }

  static toDetailResponse(
    readModel: UserAdminDetailReadModel,
  ): AdminUserDetailResponseDto {
    return {
      id: readModel.id,
      name: readModel.name !== undefined ? readModel.name : null,
      email: readModel.email,
      phone: readModel.phone !== undefined ? readModel.phone : null,
      isActive: readModel.isActive,
      createdAt: readModel.createdAt,
      updatedAt: readModel.updatedAt,
      deletedAt: readModel.deletedAt !== undefined ? readModel.deletedAt : null,
    };
  }
}
