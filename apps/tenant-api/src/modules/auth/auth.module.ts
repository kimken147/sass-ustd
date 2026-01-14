import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { User, Agent } from "@saas-platform/database";
import {
  JwtService,
  PasswordService,
  TokenBlacklistService,
  InMemoryTokenBlacklistService,
  RedisTokenBlacklistService,
} from "@saas-platform/auth";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Agent]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      // @ts-expect-error - expiresIn type mismatch between @nestjs/jwt types and actual usage
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("JWT_ACCESS_SECRET") ||
          "your-access-secret",
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
        },
      }),
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
      useFactory: async (
        configService: ConfigService
      ): Promise<TokenBlacklistService> => {
        const nodeEnv = configService.get<string>("NODE_ENV", "development");
        const redisUrl = configService.get<string>("REDIS_URL");

        // 生產環境且有 Redis URL 時使用 Redis，否則使用內存
        if (nodeEnv === "production" && redisUrl) {
          try {
            // 動態導入 redis 客戶端
            const { createClient } = await import("redis");
            const redisClient = createClient({ url: redisUrl });
            await redisClient.connect();
            // 創建適配器以符合 RedisTokenBlacklistService 的接口
            const redisAdapter = {
              set: async (
                key: string,
                value: string,
                options?: { EX?: number }
              ): Promise<void> => {
                await redisClient.set(key, value, options);
              },
              get: async (key: string): Promise<string | null> => {
                const result = await redisClient.get(key);
                // redis 客戶端可能返回 string 或 Buffer，轉換為 string
                if (result === null) {
                  return null;
                }
                return typeof result === "string" ? result : result.toString();
              },
              del: async (key: string): Promise<void> => {
                await redisClient.del(key);
              },
            };
            return new RedisTokenBlacklistService(redisAdapter);
          } catch (error) {
            console.warn(
              "無法連接到 Redis，回退到內存 TokenBlacklistService:",
              error instanceof Error ? error.message : error
            );
            return new InMemoryTokenBlacklistService(true);
          }
        }

        // 開發環境或沒有 Redis URL 時使用內存
        return new InMemoryTokenBlacklistService(true);
      },
      inject: [ConfigService],
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    {
      provide: "TokenBlacklistService",
      useFactory: async (
        configService: ConfigService
      ): Promise<TokenBlacklistService> => {
        const nodeEnv = configService.get<string>("NODE_ENV", "development");
        const redisUrl = configService.get<string>("REDIS_URL");

        // 生產環境且有 Redis URL 時使用 Redis，否則使用內存
        if (nodeEnv === "production" && redisUrl) {
          try {
            // 動態導入 redis 客戶端
            const { createClient } = await import("redis");
            const redisClient = createClient({ url: redisUrl });
            await redisClient.connect();
            // 創建適配器以符合 RedisTokenBlacklistService 的接口
            const redisAdapter = {
              set: async (
                key: string,
                value: string,
                options?: { EX?: number }
              ): Promise<void> => {
                await redisClient.set(key, value, options);
              },
              get: async (key: string): Promise<string | null> => {
                const result = await redisClient.get(key);
                // redis 客戶端可能返回 string 或 Buffer，轉換為 string
                if (result === null) {
                  return null;
                }
                return typeof result === "string" ? result : result.toString();
              },
              del: async (key: string): Promise<void> => {
                await redisClient.del(key);
              },
            };
            return new RedisTokenBlacklistService(redisAdapter);
          } catch (error) {
            console.warn(
              "無法連接到 Redis，回退到內存 TokenBlacklistService:",
              error instanceof Error ? error.message : error
            );
            return new InMemoryTokenBlacklistService(true);
          }
        }

        // 開發環境或沒有 Redis URL 時使用內存
        return new InMemoryTokenBlacklistService(true);
      },
      inject: [ConfigService],
    },
  ],
})
export class AuthModule {}
