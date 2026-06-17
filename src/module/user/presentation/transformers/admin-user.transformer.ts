import { UserAdminListItemReadModel } from '../../domain/models/user/user-admin-list.read-model';
import {
  AdminUserListResponseDto,
  AdminUserListItemResponseDto,
} from '../dtos/response/admin-user-list.response.dto';
import { UserAdminDetailReadModel } from '../../domain/models/user/user-admin-detail.read-model';
import { UserPrimitives } from '../../domain/models/user/user';
import { AdminUserDetailResponseDto } from '../dtos/response/admin-user-detail.response.dto';
import { AdminUserCommandResponseDto } from '../dtos/response/admin-user-command.response.dto';

export class AdminUserTransformer {
  static toListResponse(result: {
    items: UserAdminListItemReadModel[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }): AdminUserListResponseDto {
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

  /** 조회(쿼리) ReadModel → 상세 응답 */
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

  /**
   * 커맨드(활성/비활성) 결과 Primitives → 커맨드 응답.
   * 쿼리측 ReadModel·`AdminUserDetailResponseDto`와 **완전 분리**된 전용 타입
   * (`AdminUserCommandResponseDto`).
   */
  static fromPrimitives(
    primitives: UserPrimitives,
  ): AdminUserCommandResponseDto {
    return {
      id: primitives.id,
      name: primitives.name !== undefined ? primitives.name : null,
      email: primitives.email,
      phone: primitives.phone !== undefined ? primitives.phone : null,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      deletedAt:
        primitives.deletedAt !== undefined ? primitives.deletedAt : null,
    };
  }
}
