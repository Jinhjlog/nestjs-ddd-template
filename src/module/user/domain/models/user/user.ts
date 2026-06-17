import {
  AggregateRoot,
  BoundedString,
  Email,
  HasPrimitives,
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

/** 회원 공개 원시 투영 (password 등 민감필드 제외) */
export interface UserPrimitives {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class User
  extends AggregateRoot<UserProps>
  implements HasPrimitives<UserPrimitives>
{
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

  /** 공개 원시 투영 (password 제외) */
  toPrimitives(): UserPrimitives {
    return {
      id: this.id.toString(),
      name: this.props.name?.value,
      email: this.props.email.value,
      phone: this.props.phone?.value,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      deletedAt: this.props.deletedAt,
    };
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
