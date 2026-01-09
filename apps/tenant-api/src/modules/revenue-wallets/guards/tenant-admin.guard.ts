import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@saas-platform/database';

/**
 * 站長權限守衛
 * 確保只有 TENANT_ADMIN 角色可以訪問
 */
@Injectable()
export class TenantAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登入');
    }

    if (user.role !== UserRole.TENANT_ADMIN) {
      throw new ForbiddenException('只有站長可以執行此操作');
    }

    return true;
  }
}
