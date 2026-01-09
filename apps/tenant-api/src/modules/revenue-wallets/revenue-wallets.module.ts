import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tenant } from '@saas-platform/database';
import { RevenueWalletsController } from './revenue-wallets.controller';
import { RevenueWalletsService } from './revenue-wallets.service';

@Module({
  imports: [MikroOrmModule.forFeature([Tenant])],
  controllers: [RevenueWalletsController],
  providers: [RevenueWalletsService],
  exports: [RevenueWalletsService],
})
export class RevenueWalletsModule {}
