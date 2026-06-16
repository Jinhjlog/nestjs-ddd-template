import { ValueObject } from '@lib/domain';
import { ValueObjectValidationException } from '@shared/exception';

export const AdminRoleValues = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const;

export type AdminRoleType =
  (typeof AdminRoleValues)[keyof typeof AdminRoleValues];

interface AdminRoleProps {
  value: AdminRoleType;
}

export class AdminRole extends ValueObject<AdminRoleProps> {
  private static readonly VALID_VALUES = Object.values(AdminRoleValues);

  private constructor(props: AdminRoleProps) {
    super(props);
  }

  get value(): AdminRoleType {
    return this.props.value;
  }

  static create(value: string): AdminRole {
    if (!this.VALID_VALUES.includes(value as AdminRoleType)) {
      throw new ValueObjectValidationException({
        detail: `유효하지 않은 관리자 역할입니다. 허용된 값: ${this.VALID_VALUES.join(', ')}`,
        code: 'ADMIN_ROLE_INVALID',
      });
    }
    return new AdminRole({ value: value as AdminRoleType });
  }

  static unsafeCreate(value: string): AdminRole {
    return new AdminRole({ value: value as AdminRoleType });
  }
}
