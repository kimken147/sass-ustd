import { Injectable, UnauthorizedException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { BaseUser, UserStatus } from "@saas-platform/database";
import { JwtService, PasswordService, TokenBlacklistService } from "./index";
import { AuthConfig } from "./auth-config.interface";

/**
 * 基礎認證服務
 * 提供共享的認證邏輯，可被不同 API 繼承使用
 */
@Injectable()
export abstract class BaseAuthService {
  protected abstract readonly userRepository: any; // EntityRepository<User>
  protected abstract readonly em: EntityManager;
  protected abstract readonly jwtService: JwtService;
  protected abstract readonly passwordService: PasswordService;
  protected abstract readonly tokenBlacklist: TokenBlacklistService;
  protected abstract readonly authConfig: AuthConfig;

  /**
   * 根據 tenantMode 配置添加租戶查詢條件
   */
  private applyTenantCondition(query: any): void {
    switch (this.authConfig.tenantMode) {
      case "required":
        // Platform DB: 查詢有租戶關聯的用戶
        query.tenant = { $ne: null };
        break;
      case "none":
        // Platform DB: 查詢沒有租戶關聯的用戶（Platform Admin）
        query.tenant = null;
        break;
      case "skip":
        // Tenant DB: 不添加租戶條件（整個 DB 都是同一租戶）
        break;
    }
  }

  /**
   * 通用登入方法（protected，供子類調用）
   */
  protected async doLogin(
    username: string,
    password: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
    };
  }> {
    // 構建查詢條件
    const query: any = {
      username,
      role: { $in: this.authConfig.allowedRoles },
    };

    // 根據 tenantMode 添加租戶條件
    this.applyTenantCondition(query);

    // 查找用戶
    const user = await this.userRepository.findOne(query);

    if (!user) {
      throw new UnauthorizedException("帳號或密碼錯誤");
    }

    // 檢查用戶狀態
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("帳號已被停用");
    }

    // 驗證密碼
    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("帳號或密碼錯誤");
    }

    // 生成 Token
    const tokenPair = this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email, // JWT 中保留 email 用於識別
      role: user.role,
    });

    // 更新最後登入時間
    user.lastLoginAt = new Date();
    await this.em.flush();

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * 刷新 Token（protected，供子類調用）
   */
  protected async doRefreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
    };
  }> {
    // 驗證 refresh token
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedException("無效的 Refresh Token");
    }

    // 檢查 refresh token 是否在黑名單中
    const isBlacklisted = await this.tokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException("Token 已失效");
    }

    // 查找用戶
    const query: any = {
      id: payload.sub,
      role: { $in: this.authConfig.allowedRoles },
    };

    // 根據 tenantMode 添加租戶條件
    this.applyTenantCondition(query);

    const user = await this.userRepository.findOne(query);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("用戶不存在或已被停用");
    }

    // 生成新的 Token 對
    const tokenPair = this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * 登出
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    const jwt = require("jsonwebtoken");
    try {
      const accessPayload = jwt.decode(accessToken) as any;
      if (accessPayload?.exp) {
        await this.tokenBlacklist.addToBlacklist(
          accessToken,
          accessPayload.exp
        );
      }

      if (refreshToken) {
        const refreshPayload = jwt.decode(refreshToken) as any;
        if (refreshPayload?.exp) {
          await this.tokenBlacklist.addToBlacklist(
            refreshToken,
            refreshPayload.exp
          );
        }
      }
    } catch (error) {
      await this.tokenBlacklist.addToBlacklist(
        accessToken,
        Date.now() / 1000 + 3600
      );
      if (refreshToken) {
        await this.tokenBlacklist.addToBlacklist(
          refreshToken,
          Date.now() / 1000 + 3600
        );
      }
    }
  }

  /**
   * 驗證用戶（用於 Guard）
   */
  async validateUser(userId: number): Promise<BaseUser | null> {
    const query: any = {
      id: userId,
      role: { $in: this.authConfig.allowedRoles },
      status: UserStatus.ACTIVE,
    };

    // 根據 tenantMode 添加租戶條件
    this.applyTenantCondition(query);

    return await this.userRepository.findOne(query);
  }
}
