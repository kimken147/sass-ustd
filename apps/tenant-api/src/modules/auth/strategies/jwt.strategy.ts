import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@saas-platform/auth';
import { TenantUser, UserStatus } from '@saas-platform/database';
import { ConnectionManagerService } from '../../../common/database/connection-manager.service';
import { TenantContextService } from '../../../common/tenant-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly tenantContext: TenantContextService,
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
  ): Promise<TenantUser> {
    // 驗證 token 類型
    if (payload.type !== 'access') {
      throw new UnauthorizedException('無效的 Token 類型');
    }

    // 從 tenant context 獲取租戶資訊
    const tenantSlug = this.tenantContext.getTenantSlugOrThrow();

    // 驗證 token 中的 tenantSlug 與請求的 tenantSlug 一致
    if (payload.tenantSlug && payload.tenantSlug !== tenantSlug) {
      throw new UnauthorizedException('租戶不匹配');
    }

    // 獲取租戶的 EntityManager
    await this.connectionManager.getConnection(tenantSlug);
    const em = this.connectionManager.getEntityManager(tenantSlug);

    // 驗證用戶是否存在且活躍
    const user = await em.findOne(TenantUser, {
      id: payload.sub,
      status: UserStatus.ACTIVE,
    });

    if (!user) {
      throw new UnauthorizedException('用戶不存在或已被停用');
    }

    return user;
  }
}
