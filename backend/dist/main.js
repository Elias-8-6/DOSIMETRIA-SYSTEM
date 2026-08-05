"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger("Bootstrap");
    app.setGlobalPrefix("api/v1");
    app.enableCors({
        origin: process.env.NODE_ENV === "production"
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
//# sourceMappingURL=main.js.map