import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { RevenueWalletsModule } from "./modules/revenue-wallets/revenue-wallets.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { TenantContextModule, TenantContextMiddleware } from "./common/tenant-context";
import { DatabaseModule } from "./common/database";

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // 多租戶 Context 模組
    TenantContextModule,

    // 多租戶資料庫模組
    DatabaseModule,

    // 功能模組
    AuthModule,
    RevenueWalletsModule,
    AgentsModule,
    ContractsModule,
    TransactionsModule,
    CustomersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*'); // 所有路由都需要租戶識別
  }
}
