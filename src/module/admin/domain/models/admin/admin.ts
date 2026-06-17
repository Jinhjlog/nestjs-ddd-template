import {
  AggregateRoot,
  BoundedString,
  Email,
  HasPrimitives,
  Password,
  UniqueEntityId,
} from '@lib/domain';
import { AdminRole } from './admin-role';

export interface AdminProps {
  id?: string;
  loginId: BoundedString;
  password: Password;
  name: BoundedString;
  email?: Email;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** 관리자 공개 원시 투영 (password 등 민감필드 제외) */
export interface AdminPrimitives {
  id: string;
  loginId: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Admin
  extends AggregateRoot<AdminProps>
  implements HasPrimitives<AdminPrimitives>
{
  private constructor(props: AdminProps) {
    super(props, new UniqueEntityId(props.id));
  }

  get loginId(): BoundedString {
    return this.props.loginId;
  }

  get password(): Password {
    return this.props.password;
  }

  get name(): BoundedString {
    return this.props.name;
  }

  get email(): Email | undefined {
    return this.props.email;
  }

  get role(): AdminRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  /** 공개 원시 투영 (password 제외) */
  toPrimitives(): AdminPrimitives {
    return {
      id: this.id.toString(),
      loginId: this.props.loginId.value,
      name: this.props.name.value,
      email: this.props.email?.value,
      role: this.props.role.value,
      isActive: this.props.isActive,
      lastLoginAt: this.props.lastLoginAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  /** 마지막 로그인 시각 갱신 */
  updateLastLoginAt(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * 계정 정보를 수정합니다.
   * undefined인 필드는 변경하지 않고, null은 해당 값 제거를 의미합니다 (email 한정).
   */
  update(params: {
    name?: BoundedString;
    email?: Email | null;
    role?: AdminRole;
    isActive?: boolean;
    password?: Password;
  }): void {
    if (params.name !== undefined) this.props.name = params.name;
    if (params.email !== undefined)
      this.props.email = params.email !== null ? params.email : undefined;
    if (params.role !== undefined) this.props.role = params.role;
    if (params.isActive !== undefined) this.props.isActive = params.isActive;
    if (params.password !== undefined) this.props.password = params.password;
    this.props.updatedAt = new Date();
  }

  /**
   * 새로운 관리자 계정을 생성합니다.
   */
  static create(props: {
    loginId: BoundedString;
    password: Password;
    name: BoundedString;
    email?: Email;
    role: AdminRole;
  }): Admin {
    const now = new Date();
    return new Admin({
      loginId: props.loginId,
      password: props.password,
      name: props.name,
      email: props.email,
      role: props.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DB에서 복원합니다 (Mapper 전용, 검증 없음).
   */
  static unsafeCreate(props: AdminProps): Admin {
    return new Admin(props);
  }
}
