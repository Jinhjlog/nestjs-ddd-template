import { BoundedString } from '@lib/domain';
import { Admin } from '../models';

export abstract class AdminRepository {
  abstract save(admin: Admin): Promise<void>;
  abstract findById(id: string): Promise<Admin | undefined>;
  abstract findByLoginId(loginId: BoundedString): Promise<Admin | undefined>;
}
