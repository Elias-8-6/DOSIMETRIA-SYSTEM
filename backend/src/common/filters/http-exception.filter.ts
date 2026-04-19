import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * HttpExceptionFilter — maneja todas las excepciones HTTP.
 * Estandariza el formato de error en todas las respuestas.
 *
 * Formato de respuesta de error:
 * {
 *   statusCode: 404,
 *   message: "Dosímetro no encontrado",
 *   error: "Not Found",
 *   timestamp: "2026-01-15T10:30:00.000Z",
 *   path: "/api/dosimeters/abc-123"
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Error interno del servidor";

    const errorResponse = {
      statusCode: status,
      message:
        typeof message === "object" && "message" in (message as object)
          ? (message as any).message
          : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} — ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(errorResponse);
  }
}
