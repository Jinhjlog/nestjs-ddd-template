import { UniqueEntityId } from '../unique-entity-id';

export interface IDomainEvent<T = Record<string, any>> {
  dateTimeOccurred: Date;
  getAggregateId(): UniqueEntityId;
  metadata?: T;
}
