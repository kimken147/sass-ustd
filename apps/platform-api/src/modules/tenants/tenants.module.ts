import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { Tenant, SystemWallet } from "@saas-platform/database";
import { EncryptionService } from "@saas-platform/auth";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [
    MikroOrmModule.forFeature([Tenant, SystemWallet]),
    ConfigModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService, EncryptionService],
  exports: [TenantsService],
})
export class TenantsModule {}
