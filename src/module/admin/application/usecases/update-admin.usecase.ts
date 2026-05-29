import { Injectable } from '@nestjs/common';
import { BoundedString, Email, Password } from '@lib/domain';
import {
  DomainRuleViolationException,
  EntityNotFoundException,
} from '@shared/exception';
import { AdminRepository } from '../../domain/repositories/admin.repository';
import { AdminRole } from '../../domain/models/admin/admin-role';
import { UpdateAdminDto } from '../dtos/update-admin.dto';

@Injectable()
export class UpdateAdminUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(dto: UpdateAdminDto): Promise<{ id: string }> {
    // 1. DTO → 도메인 모델 변환 및 검증 (인메모리, DB 호출 전 빠른 실패)
    const name =
      dto.name !== undefined
        ? BoundedString.create(dto.name, { fieldName: 'name', maxLength: 50 })
        : undefined;

    let email: Email | null | undefined = undefined;
    if (dto.email !== undefined) {
      email = dto.email !== null ? Email.create(dto.email) : null;
    }

    const role =
      dto.role !== undefined ? AdminRole.create(dto.role) : undefined;

    const password =
      dto.password !== undefined
        ? await Password.create(dto.password, true)
        : undefined;

    // 2. 관리자 존재 확인
    const admin = await this.adminRepository.findById(dto.id);
    if (!admin || admin.deletedAt) {
      throw new EntityNotFoundException({
        id: dto.id,
        entityName: 'Admin',
        errorCode: 'ADMIN_NOT_FOUND',
      });
    }

    // 3. 비즈니스 규칙 검증 - 본인 계정 비활성화 방지
    if (dto.isActive === false && dto.id === dto.requesterId) {
      throw new DomainRuleViolationException({
        entityName: 'Admin',
        reason: '본인 계정은 비활성화할 수 없습니다.',
        errorCode: 'CANNOT_DEACTIVATE_SELF',
      });
    }

    // 4. 도메인 모델 수정
    admin.update({ name, email, role, isActive: dto.isActive, password });

    // 5. 저장
    await this.adminRepository.save(admin);

    return { id: admin.id.toString() };
  }
}
