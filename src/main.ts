import dotenv from 'dotenv';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { corsOriginDelegate } from './common/cors.util';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

dotenv.config({ override: true });

const HTTP_REQUEST_TIMEOUT_MS = Number(
  process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000,
);
const HTTP_HEADERS_TIMEOUT_MS = Number(
  process.env.HTTP_HEADERS_TIMEOUT_MS ?? 35_000,
);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(requestIdMiddleware);

  // CORS - bonnes pratiques:
  // - pas de "*" en prod
  // - liste blanche via variable d'env
  // - credentials activé seulement si nécessaire (cookies/session)
  app.enableCors({
    origin: corsOriginDelegate,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';

  if (!swaggerUser || !swaggerPassword) {
    throw new Error(
      'Missing SWAGGER_USER or SWAGGER_PASSWORD environment variables.',
    );
  }

  app.use(
    [`/${swaggerPath}`, `/${swaggerPath}-json`],
    basicAuth({
      challenge: true,
      users: {
        [swaggerUser]: swaggerPassword,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Raffia Weave Flow API')
    .setDescription('API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, documentFactory);

  const server = await app.listen(process.env.PORT ?? 3000);
  server.setTimeout(HTTP_REQUEST_TIMEOUT_MS);
  server.headersTimeout = HTTP_HEADERS_TIMEOUT_MS;
  server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
}
bootstrap();
