import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantEntityManagerProvider, TENANT_ENTITY_MANAGER } from './tenant-entity-manager.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ConnectionManagerService, TenantEntityManagerProvider],
  exports: [ConnectionManagerService, TENANT_ENTITY_MANAGER],
})
export class DatabaseModule {}
