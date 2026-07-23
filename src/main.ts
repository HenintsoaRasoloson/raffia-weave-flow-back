import dotenv from 'dotenv';
import basicAuth from 'express-basic-auth';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { corsOriginDelegate } from './common/cors.util';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

dotenv.config({ override: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS - bonnes pratiques:
  // - pas de "*" en prod
  // - liste blanche via variable d'env
  // - credentials activé seulement si nécessaire (cookies/session)
  app.enableCors({
    origin: corsOriginDelegate,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();