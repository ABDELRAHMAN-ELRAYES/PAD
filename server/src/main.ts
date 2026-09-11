import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformResponseInterceptor } from "./common/interceptors/transform-response.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { createValidationPipe } from "./common/pipes/validation.pipe";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformResponseInterceptor(),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("PAD API (Planning & Architecture Designer)")
    .setDescription("Enterprise Production-Grade NestJS API with Raw SQL and AI Agents")
    .setVersion("2.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`PAD NestJS server running at http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
