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
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CheckPermission } from '../common/decorators/check-permission.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Endpoint público — no requiere token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/profile
   * Requiere JWT válido.
   * Retorna perfil completo con roles y permisos activos.
   */
  @Get('profile')
  @UseGuards(JwtGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }

  /**
   * GET /auth/test-permission
   * ENDPOINT TEMPORAL — solo para verificar que PermissionsGuard funciona.
   * Requiere JWT válido + permiso 'dosimeters:read'.
   * Eliminar cuando UsersModule esté implementado.
   */
  @Get('test-permission')
  @UseGuards(JwtGuard, PermissionsGuard)
  @CheckPermission('dosimeters', 'read')
  testPermission(@CurrentUser() user: JwtPayload) {
    return {
      message: 'PermissionsGuard funcionando correctamente',
      user_id: user.sub,
      permission_checked: 'dosimeters:read',
    };
  }
}
