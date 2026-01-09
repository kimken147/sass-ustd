import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@saas-platform/database';

/**
 * 獲取當前登入用戶的裝飾器
 * 
 * 使用方式：
 * @Get('profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
