import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    const tenantId = req.headers?.["x-tenant-id"] || "-";
    const userAgent = req.headers?.["user-agent"] || "";

    // Skip health check noise
    if (userAgent.includes("ELB-HealthChecker")) {
      res.status(status).json(
        typeof message === "object" ? message : { statusCode: status, message }
      );
      return;
    }

    // 4xx log as warn, 5xx log as error
    const logMessage =
      `${req.method} ${req.originalUrl || req.url} ${status} - ` +
      `tenant:${tenantId} ip:${req.ip} ` +
      `body:${JSON.stringify(req.body)} ` +
      `error:${typeof message === "string" ? message : JSON.stringify(message)}`;

    if (status >= 500) {
      this.logger.error(logMessage);
      if (!(exception instanceof HttpException)) {
        this.logger.error(exception);
      }
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    const responseBody =
      typeof message === "object"
        ? message
        : { statusCode: status, message };

    res.status(status).json(responseBody);
  }
}
