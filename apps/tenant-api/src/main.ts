import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

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
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // CORS 設置
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  });

  // Swagger 文檔
  const config = new DocumentBuilder()
    .setTitle("Tenant API")
    .setDescription("Tenant Business API - 支援站長和代理登入")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.TENANT_API_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Tenant API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
