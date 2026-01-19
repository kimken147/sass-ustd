import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PasswordService, EncryptionService } from "@saas-platform/auth";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { TronService } from "./services/tron.service";

@Module({
  imports: [
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
