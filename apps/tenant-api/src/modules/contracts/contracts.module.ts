import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import {
  Tenant,
  User,
  Customer,
  Agent,
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

@Module({
  imports: [MikroOrmModule.forFeature([Tenant, User, Customer, Agent])],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    {
      provide: PasswordService,
      useFactory: () => new PasswordService(10),
    },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
