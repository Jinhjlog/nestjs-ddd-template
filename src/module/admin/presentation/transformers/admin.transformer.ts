import { AdminListItemReadModel } from '../../domain/models/admin/admin-list.read-model';
import { AdminDetailReadModel } from '../../domain/models/admin/admin-detail.read-model';
import {
  AdminListItemResponseDto,
  AdminListResponseDto,
} from '../dtos/response/admin-list.response.dto';
import { AdminDetailResponseDto } from '../dtos/response/admin-detail.response.dto';

export class AdminTransformer {
  static toListResponse(items: AdminListItemReadModel[]): AdminListResponseDto {
    const dtoItems: AdminListItemResponseDto[] = items.map((item) => ({
      id: item.id,
      loginId: item.loginId,
      name: item.name,
      email: item.email !== undefined ? item.email : null,
      role: item.role,
      isActive: item.isActive,
      lastLoginAt: item.lastLoginAt !== undefined ? item.lastLoginAt : null,
      createdAt: item.createdAt,
    }));

    return { items: dtoItems };
  }

  static toDetailResponse(
    detail: AdminDetailReadModel,
  ): AdminDetailResponseDto {
    return {
      id: detail.id,
      loginId: detail.loginId,
      name: detail.name,
      email: detail.email !== undefined ? detail.email : null,
      role: detail.role,
      isActive: detail.isActive,
      lastLoginAt: detail.lastLoginAt !== undefined ? detail.lastLoginAt : null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
