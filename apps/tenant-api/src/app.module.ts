import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Tenant, User, Agent } from "@saas-platform/database";
import { AuthModule } from "./modules/auth/auth.module";
import { RevenueWalletsModule } from "./modules/revenue-wallets/revenue-wallets.module";
import { AgentsModule } from "./modules/agents/agents.module";

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
        const tenantId = configService.get("TENANT_ID");
        const dbName = configService.get("TENANT_DB_NAME", "tenant");

        // 為每個租戶使用獨立的資料庫
        // 方式 1: 資料庫名稱加上租戶 ID
        const tenantDbName = `${dbName}_${tenantId}`;

        // 方式 2: 使用不同的資料庫連接字串（如果環境變數有提供）
        // const tenantDbName = configService.get(`TENANT_${tenantId}_DB_NAME`);

        return {
          driver: require("@mikro-orm/postgresql").PostgreSqlDriver,
          dbName: tenantDbName,
          host: configService.get("TENANT_DB_HOST", "localhost"),
          port: configService.get("TENANT_DB_PORT", 5432),
          user: configService.get("TENANT_DB_USER", "postgres"),
          password: configService.get("TENANT_DB_PASSWORD", "postgres"),

          // 實體列表
          entities: [Tenant, User, Agent],

          // 開發環境設置
          debug: configService.get("NODE_ENV") !== "production",

          // 自動發現實體
          discovery: {
            warnWhenNoEntities: true,
            requireEntitiesArray: false,
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
    // CustomersModule,
    // ProductsModule,
    // OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
