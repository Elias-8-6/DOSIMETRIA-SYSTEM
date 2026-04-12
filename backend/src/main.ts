import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  // Prefijo global para todas las rutas
  app.setGlobalPrefix("api/v1");

  // CORS — en producción restringir a los dominios del frontend
  app.enableCors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://tu-dominio-react.com"]
        : "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Backend corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`🌍 Entorno: ${process.env.NODE_ENV ?? "development"}`);
}

bootstrap();
