import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TokenBlacklistService } from '@saas-platform/auth';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject('TokenBlacklistService')
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 檢查是否有 @Public() 裝飾器（跳過認證）
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 先執行父類的認證
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // 檢查 token 是否在黑名單中
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (token) {
      const isBlacklisted = await this.tokenBlacklist.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token 已失效，請重新登入');
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
