import { UniqueEntityId } from './unique-entity-id';

const isEntity = (v: any): v is EntityClass<any> => {
  return v instanceof EntityClass;
};

export abstract class EntityClass<T> {
  protected readonly _id: UniqueEntityId;

  public readonly props: T;

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id ? id : new UniqueEntityId(); // ID가 주어지지 않으면 새로 생성
    this.props = props;
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  public equals(object?: EntityClass<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!isEntity(object)) {
      return false;
    }

    return this._id.equals(object._id); // ID 비교
  }
}
