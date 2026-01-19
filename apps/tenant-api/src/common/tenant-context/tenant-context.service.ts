import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantSlug: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(data: TenantContextData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  getTenantSlug(): string | undefined {
    return this.storage.getStore()?.tenantSlug;
  }

  getTenantSlugOrThrow(): string {
    const slug = this.getTenantSlug();
    if (!slug) {
      throw new Error('TenantContext not initialized');
    }
    return slug;
  }
}
