import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant-context';

@Injectable()
export class TenantTokenGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果沒有 user（未認證的請求），跳過驗證
    if (!user) {
      return true;
    }

    const tenantFromHeader = this.tenantContext.getTenantSlug();
    const tenantFromToken = user.tenantSlug;

    // 如果 Token 中沒有 tenantSlug（舊 Token），允許通過但記錄警告
    if (!tenantFromToken) {
      console.warn('Token missing tenantSlug, skipping tenant validation');
      return true;
    }

    // 驗證 Header 與 Token 中的租戶一致
    if (tenantFromHeader !== tenantFromToken) {
      throw new ForbiddenException(
        'Tenant mismatch: token tenant does not match request tenant'
      );
    }

    return true;
  }
}
