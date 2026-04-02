import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor, LoggingInterceptor, HttpExceptionFilter } from "@saas-platform/shared";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  // 全局驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // 全局響應攔截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(reflector),
  );

  // 全局異常過濾器（記錄所有錯誤到 log）
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS 設置
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  app.enableCors({
    origin: allowedOrigins === "*" ? true : allowedOrigins?.split(",") || true,
    credentials: true,
  });

  // API 前綴
  // 作用：
  // 1. 區分 API 路由和靜態資源/健康檢查端點
  // 2. 便於反向代理和網關統一管理
  // 3. 符合 REST API 命名慣例
  // 4. 避免與前端路由衝突
  app.setGlobalPrefix("api");

  // Swagger 文檔
  const config = new DocumentBuilder()
    .setTitle("Platform API")
    .setDescription("SaaS Platform Management API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PLATFORM_API_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Platform API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
