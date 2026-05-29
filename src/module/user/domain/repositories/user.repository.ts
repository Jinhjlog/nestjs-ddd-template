import { Email } from '@lib/domain';
import { User } from '../models/user';

export abstract class UserRepository {
  abstract save(user: User): Promise<void>;
  abstract findById(id: string): Promise<User | undefined>;
  abstract findByEmail(email: Email): Promise<User | undefined>;
}
