import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Reflector } from "@nestjs/core";

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 如果是 Swagger 文檔請求，跳過攔截
    if (request.url?.includes("/docs") || request.url?.includes("/api-docs")) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 如果響應已經是包裝格式（有 success 字段），直接返回
        if (data && typeof data === "object" && "success" in data) {
          return data;
        }

        // 204 No Content 響應不需要包裝
        if (response.statusCode === 204 || data === undefined || data === null) {
          return data;
        }

        // 如果響應已經是分頁格式（有 data 和 total 字段），保留原有結構並添加包裝
        if (
          data &&
          typeof data === "object" &&
          "data" in data &&
          ("total" in data || "page" in data)
        ) {
          return {
            success: true,
            ...data,
            timestamp: new Date().toISOString(),
          };
        }

        // 統一包裝響應
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}