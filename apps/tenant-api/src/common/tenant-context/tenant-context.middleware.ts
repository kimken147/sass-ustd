import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const tenantSlug = req.headers['x-tenant-id'] as string;

    if (!tenantSlug) {
      throw new BadRequestException('Missing X-Tenant-ID header');
    }

    // 驗證 tenantSlug 格式（只允許小寫字母、數字、連字號）
    if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
      throw new BadRequestException('Invalid X-Tenant-ID format');
    }

    this.tenantContext.run({ tenantSlug }, () => {
      next();
    });
  }
}
