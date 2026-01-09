import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Tenant, SystemWallet } from "@saas-platform/database";
import { SitesService } from "./sites.service";
import { SitesController } from "./sites.controller";
import { SiteStatsService } from "./services/site-stats.service";
import { TenantDbConnectionService } from "./services/tenant-db-connection.service";

@Module({
  imports: [MikroOrmModule.forFeature([Tenant, SystemWallet])],
  controllers: [SitesController],
  providers: [
    SitesService,
    SiteStatsService,
    TenantDbConnectionService,
  ],
  exports: [SitesService],
})
export class SitesModule {}
