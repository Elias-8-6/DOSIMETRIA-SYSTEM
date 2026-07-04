import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);

  logger.log(`Backend corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`Entorno: ${config.get('NODE_ENV') ?? 'development'}`);
  logger.log(`CORS origins: ${corsOrigins.join(', ')}`);
}

bootstrap();
