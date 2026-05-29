import { Injectable } from '@nestjs/common';
import { BoundedString, Email, Password } from '@lib/domain';
import { DuplicateEntityException } from '@shared/exception';
import { AdminRepository } from '../../domain/repositories/admin.repository';
import {
  AdminRole,
  AdminRoleValues,
} from '../../domain/models/admin/admin-role';
import { Admin } from '../../domain/models/admin/admin';
import { RegisterAdminDto } from '../dtos';

@Injectable()
export class RegisterAdminUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(dto: RegisterAdminDto): Promise<{ id: string }> {
    // 1. DTO → 도메인 모델 변환 및 검증 (인메모리, DB 호출 전 빠른 실패)
    const loginId = BoundedString.create(dto.loginId, {
      fieldName: 'loginId',
      maxLength: 20,
    });
    const password = await Password.create(dto.password, true);
    const name = BoundedString.create(dto.name, {
      fieldName: 'name',
      maxLength: 50,
    });
    const email = dto.email !== undefined ? Email.create(dto.email) : undefined;
    const role = AdminRole.create(AdminRoleValues.ADMIN);

    // 2. loginId 중복 검증
    const existing = await this.adminRepository.findByLoginId(loginId);
    if (existing) {
      throw new DuplicateEntityException({
        entityName: 'Admin',
        identifier: dto.loginId,
        errorCode: 'ADMIN_LOGIN_ID_DUPLICATE',
      });
    }

    // 3. 도메인 모델 생성
    const admin = Admin.create({ loginId, password, name, email, role });

    // 4. 저장
    await this.adminRepository.save(admin);

    return { id: admin.id.toString() };
  }
}
