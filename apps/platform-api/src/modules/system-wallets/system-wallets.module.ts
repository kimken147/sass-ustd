import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { SystemWallet } from "@saas-platform/database";
import { SystemWalletsService } from "./system-wallets.service";
import { SystemWalletsController } from "./system-wallets.controller";

@Module({
  imports: [MikroOrmModule.forFeature([SystemWallet])],
  controllers: [SystemWalletsController],
  providers: [SystemWalletsService],
  exports: [SystemWalletsService],
})
export class SystemWalletsModule {}
