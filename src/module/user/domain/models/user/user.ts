import {
  AggregateRoot,
  BoundedString,
  Email,
  Password,
  Phone,
  UniqueEntityId,
} from '@lib/domain';

export interface UserProps {
  id?: string;
  email: Email;
  password: Password;
  name?: BoundedString;
  phone?: Phone;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps) {
    super(props, new UniqueEntityId(props.id));
  }

  get email(): Email {
    return this.props.email;
  }

  get password(): Password {
    return this.props.password;
  }

  get name(): BoundedString | undefined {
    return this.props.name;
  }

  get phone(): Phone | undefined {
    return this.props.phone;
  }

  get isActive(): boolean {
    return this.props.isActive;
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

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  static create(
    props: Omit<UserProps, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>,
  ): User {
    const now = new Date();
    return new User({
      ...props,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static unsafeCreate(props: UserProps): User {
    return new User(props);
  }
}
