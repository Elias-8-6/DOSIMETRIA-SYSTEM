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

  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const cookieSecure = config.get<string>('COOKIE_SECURE', 'false') === 'true';

  if (nodeEnv === 'production' && !cookieSecure) {
    throw new Error(
      'COOKIE_SECURE debe ser "true" cuando NODE_ENV=production — ' +
        'las cookies de sesión (access/refresh token) no pueden viajar sin el flag Secure en producción.',
    );
  }

  // Detrás de un reverse proxy/load balancer, Express debe confiar en
  // X-Forwarded-For para que ThrottlerGuard calcule la IP real del
  // cliente en vez de siempre la IP del proxy.
  if (config.get<string>('TRUST_PROXY', 'false') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

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
