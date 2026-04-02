import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tenant, PlatformUser, SystemWallet } from '@saas-platform/database';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SystemWalletsModule } from './modules/system-wallets/system-wallets.module';
import { SitesModule } from './modules/sites/sites.module';
import { HealthController } from '@saas-platform/shared';

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // MikroORM 配置
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
        dbName: configService.get('PLATFORM_DB_NAME', 'saas_platform'),
        host: configService.get('PLATFORM_DB_HOST', 'localhost'),
        port: configService.get('PLATFORM_DB_PORT', 5432),
        user: configService.get('PLATFORM_DB_USER', 'postgres'),
        password: configService.get('PLATFORM_DB_PASSWORD', 'postgres'),

        // SSL 配置（RDS 需要）
        ...(configService.get('PLATFORM_DB_SSL') === 'true' && {
          driverOptions: {
            connection: { ssl: { rejectUnauthorized: false } },
          },
        }),

        // 實體列表 - 只包含 Platform DB 的實體
        entities: [Tenant, PlatformUser, SystemWallet],
        
        // 開發環境自動同步（生產環境應使用 migrations）
        debug: configService.get('NODE_ENV') !== 'production',
        
        // 禁用自動發現實體，明確指定實體列表
        discovery: {
          warnWhenNoEntities: true,
          requireEntitiesArray: true,
        },
        
        // 遷移配置
        migrations: {
          path: './migrations',
          transactional: true,
        },
      }),
      inject: [ConfigService],
    }),

    // 功能模組
    AuthModule,
    SystemWalletsModule,
    TenantsModule,
    SitesModule,
    // BillingModule,
    // AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

