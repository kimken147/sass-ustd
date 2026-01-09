import * as jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
  type: "access" | "refresh"; // token 類型
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access token 過期時間（秒）
}

export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string; // 例如: '15m', '1h'
  private readonly refreshTokenExpiresIn: string; // 例如: '7d', '30d'

  constructor(
    accessTokenSecret: string,
    refreshTokenSecret: string,
    accessTokenExpiresIn: string = "15m",
    refreshTokenExpiresIn: string = "7d"
  ) {
    this.accessTokenSecret = accessTokenSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.accessTokenExpiresIn = accessTokenExpiresIn;
    this.refreshTokenExpiresIn = refreshTokenExpiresIn;
  }

  /**
   * 生成 Access Token
   */
  generateAccessToken(payload: Omit<JwtPayload, "type">): string {
    const tokenPayload = { ...payload, type: "access" };
    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * 生成 Refresh Token
   */
  generateRefreshToken(payload: Omit<JwtPayload, "type">): string {
    const tokenPayload = { ...payload, type: "refresh" };
    return jwt.sign(tokenPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * 生成 Token 對（Access + Refresh）
   */
  generateTokenPair(payload: Omit<JwtPayload, "type">): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // 計算過期時間（秒）
    const expiresIn = this.parseExpiresIn(this.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * 驗證 Access Token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(
        token,
        this.accessTokenSecret
      ) as unknown as JwtPayload;
      if (payload.type !== "access") {
        throw new Error("Invalid token type");
      }
      return payload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * 驗證 Refresh Token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(
        token,
        this.refreshTokenSecret
      ) as unknown as JwtPayload;
      if (payload.type !== "refresh") {
        throw new Error("Invalid token type");
      }
      return payload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * 解析過期時間字串為秒數
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 預設 15 分鐘
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }
}
