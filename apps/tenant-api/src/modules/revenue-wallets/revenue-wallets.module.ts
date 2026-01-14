import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tenant } from '@saas-platform/database';
import { AuthModule } from '../auth/auth.module';
import { RevenueWalletsController } from './revenue-wallets.controller';
import { RevenueWalletsService } from './revenue-wallets.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Tenant]),
    AuthModule, // 導入 AuthModule 以使用 JwtAuthGuard
  ],
  controllers: [RevenueWalletsController],
  providers: [RevenueWalletsService],
  exports: [RevenueWalletsService],
})
export class RevenueWalletsModule {}
