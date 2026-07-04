import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '@config/supabase.config';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { hashToken } from '@common/utils/token-hash.util';

import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly updateProfileUC: UpdateProfileUseCase,
    private readonly changePasswordUC: ChangePasswordUseCase,
  ) {}

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, full_name, email, password_hash, organization_id, status')
      .eq('email', dto.email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('El usuario está inactivo o bloqueado');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const { data: userRoles } = await client
      .from('user_roles')
      .select('roles(code, name)')
      .eq('user_id', user.id);

    if (!userRoles?.length) {
      throw new ForbiddenException('El usuario no tiene roles asignados');
    }

    const accessToken = this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, user.organization_id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async getProfile(user: JwtPayload) {
    const client = this.supabase.getClient();

    const { data: userData, error: userError } = await client
      .from('users')
      .select(
        `id, full_name, email, status, created_at, organization_id,
         degree_title, university, location, document_number, phone,
         date_of_birth, hire_date`,
      )
      .eq('id', user.sub)
      .maybeSingle();

    if (userError) {
      this.logger.error(`getProfile query error for ${user.sub}: ${userError.message}`);
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!userData) {
      this.logger.warn(`getProfile: no row for user ${user.sub}`);
      throw new NotFoundException('Usuario no encontrado');
    }

    const [orgResult, rolesResult, permissionsResult] = await Promise.all([
      client.from('organizations').select('name').eq('id', userData.organization_id).single(),
      client.from('user_roles').select('roles(code, name)').eq('user_id', user.sub),
      client
        .from('user_permissions')
        .select('granted, permissions(code, module, action, description)')
        .eq('user_id', user.sub)
        .eq('granted', true),
    ]);

    const roles = (rolesResult.data ?? []).map((ur: any) => ur.roles);
    const permissions = (permissionsResult.data ?? []).map((up: any) => up.permissions);

    return {
      id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      status: userData.status,
      organization: orgResult.data?.name ?? null,
      roles,
      permissions,
      degree_title: userData.degree_title ?? null,
      university: userData.university ?? null,
      location: userData.location ?? null,
      document_number: userData.document_number ?? null,
      phone: userData.phone ?? null,
      date_of_birth: userData.date_of_birth ?? null,
      hire_date: userData.hire_date ?? null,
    };
  }

  private generateToken(user: {
    id: string;
    full_name: string;
    email: string;
    organization_id: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      full_name: user.full_name,
      organization_id: user.organization_id,
    };
    return this.jwt.sign(payload);
  }

  private async generateRefreshToken(userId: string, organizationId: string): Promise<string> {
    const refreshToken = this.jwt.sign(
      { sub: userId, organization_id: organizationId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.supabase.getClient().from('refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

    return refreshToken;
  }

  async refreshToken(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const { data: matchingToken } = await this.supabase
      .getClient()
      .from('refresh_tokens')
      .select('id, expires_at, revoked')
      .eq('user_id', userId)
      .eq('token_hash', tokenHash)
      .eq('revoked', false)
      .maybeSingle();

    if (!matchingToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (new Date() > new Date(matchingToken.expires_at)) {
      throw new UnauthorizedException('Refresh token expirado -- Inicia sesión Nuevamente');
    }

    await this.supabase
      .getClient()
      .from('refresh_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', matchingToken.id);

    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('id, full_name, email, organization_id, status')
      .eq('id', userId)
      .single();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const newAccessToken = this.generateToken(user);
    const newRefreshToken = await this.generateRefreshToken(userId, user.organization_id);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.supabase
      .getClient()
      .from('refresh_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('revoked', false);

    return { message: 'Sesión cerrada correctamente' };
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.updateProfileUC.execute(userId, dto);
  }

  changePassword(userId: string, dto: ChangePasswordDto) {
    return this.changePasswordUC.execute(userId, dto);
  }
}
