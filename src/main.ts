import 'dotenv/config';
import basicAuth from 'express-basic-auth';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
