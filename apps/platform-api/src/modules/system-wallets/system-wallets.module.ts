import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import { SystemWallet } from "@saas-platform/database";
import { EncryptionService } from "@saas-platform/auth";
import { SystemWalletsService } from "./system-wallets.service";
import { SystemWalletsController } from "./system-wallets.controller";

@Module({
  imports: [MikroOrmModule.forFeature([SystemWallet]), ConfigModule],
  controllers: [SystemWalletsController],
  providers: [SystemWalletsService, EncryptionService],
  exports: [SystemWalletsService],
})
export class SystemWalletsModule {}
