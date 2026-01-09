import { SetMetadata } from '@nestjs/common';

/**
 * 標記路由為公開，跳過 JWT 認證
 */
export const Public = () => SetMetadata('isPublic', true);
