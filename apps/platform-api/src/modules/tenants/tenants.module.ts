import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Tenant, SystemWallet } from "@saas-platform/database";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [MikroOrmModule.forFeature([Tenant, SystemWallet])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
