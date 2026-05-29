import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '@shared/exception';
import { AdminQueryService } from '../../domain/services/admin-query.service';
import { AdminDetailReadModel } from '../../domain/models/admin/admin-detail.read-model';

@Injectable()
export class FindAdminDetailUseCase {
  constructor(private readonly adminQueryService: AdminQueryService) {}

  async execute(id: string): Promise<AdminDetailReadModel> {
    const detail = await this.adminQueryService.findDetailById(id);
    if (!detail) {
      throw new EntityNotFoundException({
        id,
        entityName: 'Admin',
        errorCode: 'ADMIN_NOT_FOUND',
      });
    }

    return detail;
  }
}
