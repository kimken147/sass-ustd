import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { User } from "@saas-platform/database";
import {
  JwtService,
  PasswordService,
  TokenBlacklistService,
  InMemoryTokenBlacklistService,
} from "@saas-platform/auth";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [
    MikroOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      // @ts-expect-error - expiresIn type mismatch between @nestjs/jwt types and actual usage
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m";
        return {
          secret: configService.get<string>("JWT_ACCESS_SECRET"),
          signOptions: {
            expiresIn: expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: JwtService,
      useFactory: (configService: ConfigService) => {
        return new JwtService(
          configService.get<string>("JWT_ACCESS_SECRET") ||
            "your-access-secret",
          configService.get<string>("JWT_REFRESH_SECRET") ||
            "your-refresh-secret",
          configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
          configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d")
        );
      },
      inject: [ConfigService],
    },
    {
      provide: PasswordService,
      useFactory: () => new PasswordService(10),
    },
    {
      provide: "TokenBlacklistService",
      useFactory: () => new InMemoryTokenBlacklistService(true),
      // 生產環境可以替換為 Redis 實作：
      // useFactory: async (configService: ConfigService) => {
      //   const redisClient = createClient({ url: configService.get('REDIS_URL') });
      //   await redisClient.connect();
      //   return new RedisTokenBlacklistService(redisClient);
      // },
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
