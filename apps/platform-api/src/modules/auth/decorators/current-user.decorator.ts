import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformUser } from '@saas-platform/database';

/**
 * 獲取當前登入用戶的裝飾器
 * 
 * 使用方式：
 * @Get('profile')
 * async getProfile(@CurrentUser() user: PlatformUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PlatformUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
