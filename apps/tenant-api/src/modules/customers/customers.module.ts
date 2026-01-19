import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { ContractsModule } from "../contracts/contracts.module";
import { AuthModule } from "../auth/auth.module";
import { AgentGuard } from "./guards/agent.guard";
import { TenantAdminOrAgentGuard } from "./guards/tenant-admin-or-agent.guard";

@Module({
  imports: [
    ContractsModule,
    AuthModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, AgentGuard, TenantAdminOrAgentGuard],
  exports: [CustomersService],
})
export class CustomersModule {}
