import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ConfigModule } from "@nestjs/config";
import {
  TenantConfig,
  TenantUser,
  Customer,
  Agent,
  SystemFeeDistribution,
  RevenueDistribution,
  CommissionPayout,
  AgentCommissionSetting,
} from "@saas-platform/database";
import { PasswordService, EncryptionService } from "@saas-platform/auth";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { TronService } from "./services/tron.service";

@Module({
  imports: [
    MikroOrmModule.forFeature([
      TenantConfig,
      TenantUser,
      Customer,
      Agent,
      SystemFeeDistribution,
      RevenueDistribution,
      CommissionPayout,
      AgentCommissionSetting,
    ]),
    ConfigModule,
  ],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    TronService,
    EncryptionService,
    {
      provide: PasswordService,
      useFactory: () => new PasswordService(10),
    },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
