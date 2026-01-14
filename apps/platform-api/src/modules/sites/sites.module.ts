import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Tenant, SystemWallet } from "@saas-platform/database";
import { AuthModule } from "../auth/auth.module";
import { SitesService } from "./sites.service";
import { SitesController } from "./sites.controller";
import { SiteStatsService } from "./services/site-stats.service";
import { TenantDbConnectionService } from "./services/tenant-db-connection.service";

@Module({
  imports: [
    MikroOrmModule.forFeature([Tenant, SystemWallet]),
    AuthModule, // 導入 AuthModule 以使用 JwtAuthGuard
  ],
  controllers: [SitesController],
  providers: [
    SitesService,
    SiteStatsService,
    TenantDbConnectionService,
  ],
  exports: [SitesService],
})
export class SitesModule {}
