import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RevenueWalletsController } from './revenue-wallets.controller';
import { RevenueWalletsService } from './revenue-wallets.service';

@Module({
  imports: [
    AuthModule, // 導入 AuthModule 以使用 JwtAuthGuard
  ],
  controllers: [RevenueWalletsController],
  providers: [RevenueWalletsService],
  exports: [RevenueWalletsService],
})
export class RevenueWalletsModule {}
