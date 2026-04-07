import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

/**
 * AuthController — rutas de autenticación.
 *
 * Endpoints públicos (sin guard):
 *   POST /auth/login → retorna JWT directamente
 *
 * Endpoints protegidos (requieren JWT válido):
 *   GET /auth/profile → datos del usuario + roles + permisos activos
 *
 * No existe /auth/select-role — el sistema de permisos granulares
 * hace innecesaria la selección de rol activo.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Login con email y contraseña.
   * Retorna el JWT y los datos básicos del usuario.
   * Respuesta 200 en lugar de 201 (no estamos creando un recurso).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/profile
   * Retorna el perfil completo del usuario autenticado:
   * datos personales, roles asignados y permisos activos.
   * La UI usa esto para construir el menú y habilitar/deshabilitar
   * opciones según los permisos del usuario.
   */
  @Get('profile')
  @UseGuards(JwtGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }
}
