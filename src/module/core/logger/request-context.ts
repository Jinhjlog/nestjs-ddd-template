import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  userId?: string;
  method?: string;
  path?: string;
  startTime?: number;
}

class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  getRequestId(): string {
    return this.get()?.requestId || 'no-request-id';
  }

  setUserId(userId: string): void {
    const context = this.get();
    if (context) {
      context.userId = userId;
    }
  }

  generateRequestId(): string {
    return randomUUID();
  }
}

export const requestContext = new RequestContextService();
