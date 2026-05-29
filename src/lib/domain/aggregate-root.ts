import { EntityClass } from './entity';
import { IDomainEvent } from './events/i-domain-event';
import { DomainEvents } from './events/domain-events';
import { UniqueEntityId } from './unique-entity-id';

export abstract class AggregateRoot<T> extends EntityClass<T> {
  private _domainEvents: IDomainEvent[] = [];

  get id(): UniqueEntityId {
    return this._id;
  }

  get domainEvents(): IDomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);

    DomainEvents.markAggregateForDispatch(this);
  }

  public clearEvents(): void {
    this._domainEvents.splice(0, this._domainEvents.length);
  }
}
