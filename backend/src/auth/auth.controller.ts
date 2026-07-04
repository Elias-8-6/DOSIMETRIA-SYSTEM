import { Body, Controller, Get, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { clearAuthCookies, setAuthCookies } from '../common/utils/cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    setAuthCookies(res, this.config, tokens.access_token, tokens.refresh_token);
    return { message: 'Sesión iniciada correctamente' };
  }

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @CurrentUser() user: JwtPayload & { refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshToken(user.sub, user.refreshToken);
    setAuthCookies(res, this.config, tokens.access_token, tokens.refresh_token);
    return { message: 'Sesión renovada correctamente' };
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user.sub);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Patch('password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }
}
