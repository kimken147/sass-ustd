import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@saas-platform/database';

/**
 * 代理權限守衛
 * 確保只有 AGENT 角色可以訪問
 */
@Injectable()
export class AgentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登入');
    }

    if (user.role !== UserRole.AGENT) {
      throw new ForbiddenException('只有代理可以執行此操作');
    }

    return true;
  }
}
