import { Scope } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantContextService } from '../tenant-context';

export const TENANT_ENTITY_MANAGER = 'TENANT_ENTITY_MANAGER';

export const TenantEntityManagerProvider = {
  provide: TENANT_ENTITY_MANAGER,
  scope: Scope.REQUEST,
  useFactory: async (
    connectionManager: ConnectionManagerService,
    tenantContext: TenantContextService,
  ): Promise<EntityManager> => {
    const tenantSlug = tenantContext.getTenantSlugOrThrow();
    await connectionManager.getConnection(tenantSlug);
    return connectionManager.getEntityManager(tenantSlug);
  },
  inject: [ConnectionManagerService, TenantContextService],
};
