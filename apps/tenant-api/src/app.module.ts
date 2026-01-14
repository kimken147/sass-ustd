import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import {
  TenantConfig,
  TenantUser,
  Agent,
  Customer,
  SystemFeeDistribution,
  RevenueDistribution,
  CommissionPayout,
} from "@saas-platform/database";
import { AuthModule } from "./modules/auth/auth.module";
import { RevenueWalletsModule } from "./modules/revenue-wallets/revenue-wallets.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { CustomersModule } from "./modules/customers/customers.module";

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // 租戶 MikroORM 配置（每個租戶獨立資料庫）
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // 使用 TENANT_SLUG 來識別租戶（資料庫名稱格式：tenant_{slug}）
        const tenantSlug = configService.get<string>("TENANT_SLUG");

        if (!tenantSlug) {
          throw new Error("TENANT_SLUG 環境變數未設定");
        }

        // 資料庫名稱：tenant_{slug}
        const tenantDbName = `tenant_${tenantSlug}`;

        return {
          driver: require("@mikro-orm/postgresql").PostgreSqlDriver,
          dbName: tenantDbName,
          host: configService.get("TENANT_DB_HOST", "localhost"),
          port: configService.get("TENANT_DB_PORT", 5432),
          user: configService.get("TENANT_DB_USER", "postgres"),
          password: configService.get("TENANT_DB_PASSWORD", "postgres"),

          // 實體列表（使用 TenantConfig 取代 Tenant）
          entities: [
            TenantConfig,
            TenantUser,
            Agent,
            Customer,
            SystemFeeDistribution,
            RevenueDistribution,
            CommissionPayout,
          ],

          // 開發環境設置
          debug: configService.get("NODE_ENV") !== "production",

          // 自動發現實體
          discovery: {
            warnWhenNoEntities: true,
            requireEntitiesArray: true, // 要求明確指定 entities，不自動發現
            disableDynamicFileAccess: true, // 禁用動態文件訪問
          },

          // 遷移配置
          migrations: {
            path: "./migrations",
            transactional: true,
          },
        };
      },
      inject: [ConfigService],
    }),

    // 功能模組
    AuthModule,
    RevenueWalletsModule,
    AgentsModule,
    ContractsModule,
    TransactionsModule,
    CustomersModule,
    // ProductsModule,
    // OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
