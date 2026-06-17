import { AdminListItemReadModel } from '../../domain/models/admin/admin-list.read-model';
import { AdminDetailReadModel } from '../../domain/models/admin/admin-detail.read-model';
import { AdminPrimitives } from '../../domain/models/admin/admin';
import {
  AdminListItemResponseDto,
  AdminListResponseDto,
} from '../dtos/response/admin-list.response.dto';
import { AdminDetailResponseDto } from '../dtos/response/admin-detail.response.dto';
import { AdminCommandResponseDto } from '../dtos/response/admin-command.response.dto';

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

  /** 조회(쿼리) ReadModel → 상세 응답 */
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

  /**
   * 커맨드(생성/수정) 결과 Primitives → 커맨드 응답.
   * 쿼리측 ReadModel·`AdminDetailResponseDto`와 **완전 분리**된 전용 타입
   * (`AdminCommandResponseDto`) — 출처가 다르므로 함께 변하지 않게.
   */
  static fromPrimitives(primitives: AdminPrimitives): AdminCommandResponseDto {
    return {
      id: primitives.id,
      loginId: primitives.loginId,
      name: primitives.name,
      email: primitives.email !== undefined ? primitives.email : null,
      role: primitives.role,
      isActive: primitives.isActive,
      lastLoginAt:
        primitives.lastLoginAt !== undefined ? primitives.lastLoginAt : null,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
