import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import {
  Customer,
  RevenueDistribution,
  CommissionPayout,
  SystemFeeDistribution,
  Tenant,
} from "@saas-platform/database";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { ContractsModule } from "../contracts/contracts.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Customer,
      RevenueDistribution,
      CommissionPayout,
      SystemFeeDistribution,
      Tenant,
    ]),
    ContractsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
