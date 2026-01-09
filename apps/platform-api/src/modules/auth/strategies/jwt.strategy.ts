import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtPayload } from '@saas-platform/auth';
import { AuthService } from '../auth.service';
import { User } from '@saas-platform/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: any,
    payload: JwtPayload,
  ): Promise<User> {
    // 驗證 token 類型
    if (payload.type !== 'access') {
      throw new UnauthorizedException('無效的 Token 類型');
    }

    // 檢查 token 是否在黑名單中
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (token) {
      // 這裡需要注入 TokenBlacklistService，但為了避免循環依賴，
      // 我們在 AuthService 中處理黑名單檢查
    }

    // 驗證用戶是否存在且活躍
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用戶不存在或已被停用');
    }

    return user;
  }
}
