import { Injectable } from '@nestjs/common';
import { AdminQueryService } from '../../domain/services/admin-query.service';
import { AdminListItemReadModel } from '../../domain/models/admin/admin-list.read-model';

@Injectable()
export class FindAdminListUseCase {
  constructor(private readonly adminQueryService: AdminQueryService) {}

  async execute(): Promise<AdminListItemReadModel[]> {
    return this.adminQueryService.findList();
  }
}
