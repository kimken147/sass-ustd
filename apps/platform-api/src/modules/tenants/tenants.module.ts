import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { Tenant, SystemWallet } from "@saas-platform/database";
import { EncryptionService } from "@saas-platform/auth";
import { AuthModule } from "../auth/auth.module";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [
    MikroOrmModule.forFeature([Tenant, SystemWallet]),
    ConfigModule,
    AuthModule, // 導入 AuthModule 以使用 JwtAuthGuard
  ],
  controllers: [TenantsController],
  providers: [TenantsService, EncryptionService],
  exports: [TenantsService],
})
export class TenantsModule {}
