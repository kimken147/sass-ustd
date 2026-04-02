import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = req.method;
    const originalUrl = req.originalUrl || req.url;
    const ip = req.ip;
    const tenantId = req.headers?.["x-tenant-id"] || "-";
    const userAgent = req.headers?.["user-agent"] || "-";
    const start = Date.now();

    // Skip health check noise
    if (userAgent.includes("ELB-HealthChecker")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${originalUrl} ${res.statusCode} ${duration}ms - tenant:${tenantId} ip:${ip} ua:${userAgent}`
          );
        },
        error: () => {
          // Error logging is handled by HttpExceptionFilter
        },
      })
    );
  }
}
