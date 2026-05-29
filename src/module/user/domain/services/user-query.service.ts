import { UserProfileReadModel } from '../models/user/user-profile.read-model';
import { UserAdminListItemReadModel } from '../models/user/user-admin-list.read-model';
import { UserAdminDetailReadModel } from '../models/user/user-admin-detail.read-model';

/** 관리자 회원 목록 조회 파라미터 */
export interface FindAdminUserListParams {
  skip: number;
  limit: number;
  name?: string;
  isActive?: boolean;
}

/** 관리자 회원 건수 조회 파라미터 */
export interface CountAdminUserListParams {
  name?: string;
  isActive?: boolean;
}

/**
 * 사용자 조회용 QueryService
 */
export abstract class UserQueryService {
  /** ID로 사용자 프로필을 조회합니다. */
  abstract findProfileById(
    id: string,
  ): Promise<UserProfileReadModel | undefined>;

  /** 관리자 회원 목록을 조회합니다. */
  abstract findAdminList(
    params: FindAdminUserListParams,
  ): Promise<UserAdminListItemReadModel[]>;

  /** 관리자 회원 건수를 조회합니다. */
  abstract countAdminList(params: CountAdminUserListParams): Promise<number>;

  /** 관리자 회원 상세를 조회합니다. */
  abstract findAdminDetailById(
    id: string,
  ): Promise<UserAdminDetailReadModel | undefined>;
}
