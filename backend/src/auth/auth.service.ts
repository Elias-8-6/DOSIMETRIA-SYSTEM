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
import { AuditService } from '@common/services/audit.service';
import { RequestMeta } from '@common/interfaces/request-meta.interface';

import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Hash bcrypt fijo sin contraseña real asociada. Se compara contra él
// cuando el email no existe, para que el tiempo de respuesta sea el
// mismo que el de una contraseña incorrecta y no se pueda enumerar
// usuarios válidos midiendo la latencia del login.
const DUMMY_PASSWORD_HASH = '$2b$10$p/bL01HB8FdZWMC/LLZAjeyb5jMsMsfyHOQSNagKdc4Vdld0kw7Jq';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly updateProfileUC: UpdateProfileUseCase,
    private readonly changePasswordUC: ChangePasswordUseCase,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const client = this.supabase.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, full_name, email, password_hash, organization_id, status')
      .eq('email', dto.email)
      .single();

    if (error || !user) {
      // Ejecutar un compare igual de costoso que el del camino "usuario
      // existe" para no filtrar por timing si el email está registrado.
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      await this.audit.log({
        userId: null,
        entityName: 'users',
        action: 'LOGIN_FAILED',
        newValues: { email: dto.email, reason: 'credenciales_incorrectas' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'active') {
      await this.audit.log({
        userId: user.id,
        entityName: 'users',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        newValues: { email: dto.email, reason: 'usuario_inactivo' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('El usuario está inactivo o bloqueado');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      await this.audit.log({
        userId: user.id,
        entityName: 'users',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        newValues: { email: dto.email, reason: 'credenciales_incorrectas' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
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

    await this.audit.log({
      userId: user.id,
      entityName: 'users',
      entityId: user.id,
      action: 'LOGIN',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

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

  // Nota: el refresh exitoso NO se audita (ocurre cada ~15min por sesión
  // activa y sería puro ruido). Sí se audita el intento fallido, que es
  // la señal relevante para ISO 17025 (posible reuso de token robado).
  async refreshToken(userId: string, refreshToken: string, meta: RequestMeta = {}) {
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
      // Token no encontrado (ya revocado o nunca existió): posible intento
      // de reuso de un refresh token robado/expirado.
      await this.audit.log({
        userId,
        entityName: 'users',
        entityId: userId,
        action: 'LOGIN_FAILED',
        newValues: { reason: 'refresh_token_invalido' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
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

  async logout(userId: string, meta: RequestMeta = {}) {
    await this.supabase
      .getClient()
      .from('refresh_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('revoked', false);

    await this.audit.log({
      userId,
      entityName: 'users',
      entityId: userId,
      action: 'LOGOUT',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { message: 'Sesión cerrada correctamente' };
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.updateProfileUC.execute(userId, dto);
  }

  changePassword(userId: string, dto: ChangePasswordDto, meta: RequestMeta = {}) {
    return this.changePasswordUC.execute(userId, dto, meta);
  }
}
