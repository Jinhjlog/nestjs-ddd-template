import { AdminListItemReadModel } from '../models/admin/admin-list.read-model';
import { AdminDetailReadModel } from '../models/admin/admin-detail.read-model';

export abstract class AdminQueryService {
  abstract findList(): Promise<AdminListItemReadModel[]>;
  abstract findDetailById(
    id: string,
  ): Promise<AdminDetailReadModel | undefined>;
}
