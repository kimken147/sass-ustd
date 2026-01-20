import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "@saas-platform/shared";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 開發環境啟用所有日誌級別（包括 debug）
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
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
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // CORS 設置
  app.enableCors({
    origin: true, // 允許所有來源（開發環境）
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "x-tenant-slug", "x-tenant-config"],
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
    .setTitle("Tenant API")
    .setDescription("Tenant Business API - 支援站長和代理登入")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.TENANT_API_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Tenant API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
