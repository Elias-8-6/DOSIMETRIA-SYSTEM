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
import { SelectRoleDto } from './dto/select-role.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Login con email y contraseña.
   * Si el usuario tiene múltiples roles, retorna requires_role_selection: true
   * y el frontend debe llamar a /auth/select-role.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/select-role
   * Selecciona el rol activo para la sesión.
   * Requiere el token temporal recibido en /login.
   * Retorna un nuevo JWT con active_role definitivo.
   */
  @Post('select-role')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  selectRole(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SelectRoleDto,
  ) {
    return this.authService.selectRole(user, dto);
  }

  /**
   * GET /auth/profile
   * Retorna el perfil del usuario autenticado.
   * Incluye sus roles asignados y la organización.
   */
  @Get('profile')
  @UseGuards(JwtGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }
}
