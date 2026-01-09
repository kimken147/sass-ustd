import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tenant, User, Agent } from '@saas-platform/database';
import { AuthModule } from './modules/auth/auth.module';

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
        
        // 實體列表
        entities: [Tenant, User, Agent],
        
        // 開發環境自動同步（生產環境應使用 migrations）
        debug: configService.get('NODE_ENV') !== 'production',
        
        // 自動發現實體
        discovery: {
          warnWhenNoEntities: true,
          requireEntitiesArray: false,
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
    // TenantsModule,
    // BillingModule,
    // AnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

