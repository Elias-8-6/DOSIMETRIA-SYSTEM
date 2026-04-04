import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '@config/supabase.config';
import { JwtPayload, Role } from '@common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { SelectRoleDto } from './dto/select-role.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * login()
   * 1. Busca el usuario por email
   * 2. Verifica la contraseña con bcrypt
   * 3. Carga los roles asignados al usuario
   * 4. Si tiene un solo rol: genera JWT con active_role directamente
   * 5. Si tiene múltiples roles: genera JWT temporal sin active_role
   *    para que el frontend muestre el selector de rol
   */
  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    // Buscar usuario por email
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

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Cargar roles del usuario
    const { data: userRoles } = await client
      .from('user_roles')
      .select('roles(code, name)')
      .eq('user_id', user.id);

    const roles = (userRoles ?? []).map((ur: any) => ur.roles);

    if (!roles.length) {
      throw new ForbiddenException('El usuario no tiene roles asignados');
    }

    // Si tiene un solo rol, seleccionarlo automáticamente
    if (roles.length === 1) {
      const token = this.generateToken(user, roles[0].code);
      return {
        access_token:   token,
        requires_role_selection: false,
        user: {
          id:          user.id,
          full_name:   user.full_name,
          email:       user.email,
          active_role: roles[0].code,
          role_name:   roles[0].name,
        },
      };
    }

    // Múltiples roles: retornar lista para que el frontend muestre selector
    const tempToken = this.generateTempToken(user);
    return {
      access_token:   tempToken,
      requires_role_selection: true,
      available_roles: roles,
      user: {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
      },
    };
  }

  /**
   * selectRole()
   * El usuario elige con qué rol operar en esta sesión.
   * Verifica que el rol solicitado esté asignado al usuario.
   * Genera un nuevo JWT con active_role definitivo.
   */
  async selectRole(user: JwtPayload, dto: SelectRoleDto) {
    const client = this.supabase.getClient();

    // Verificar que el usuario tenga ese rol asignado
    const { data: roleAssignment } = await client
      .from('user_roles')
      .select('roles(code, name)')
      .eq('user_id', user.sub)
      .eq('roles.code', dto.role)
      .single();

    if (!roleAssignment) {
      throw new ForbiddenException(
        `No tenés el rol '${dto.role}' asignado en tu cuenta`,
      );
    }

    // Buscar datos completos del usuario
    const { data: userData } = await client
      .from('users')
      .select('id, full_name, email, organization_id')
      .eq('id', user.sub)
      .single();

    if (!userData) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const token = this.generateToken(userData, dto.role);

    return {
      access_token: token,
      user: {
        id:          userData.id,
        full_name:   userData.full_name,
        email:       userData.email,
        active_role: dto.role,
      },
    };
  }

  /**
   * getProfile()
   * Retorna los datos del usuario autenticado desde el JWT.
   */
  async getProfile(user: JwtPayload) {
    const client = this.supabase.getClient();

    const { data } = await client
      .from('users')
      .select(`
        id, full_name, email, status, created_at,
        organizations(name),
        user_roles(roles(code, name))
      `)
      .eq('id', user.sub)
      .single();

    return data;
  }

  // ── Métodos privados ────────────────────────────────────────

  private generateToken(
    user: { id: string; full_name: string; email: string; organization_id: string },
    activeRole: string,
  ): string {
    const payload: JwtPayload = {
      sub:             user.id,
      email:           user.email,
      full_name:       user.full_name,
      organization_id: user.organization_id,
      active_role:     activeRole,
    };
    return this.jwt.sign(payload);
  }

  /**
   * Token temporal usado cuando el usuario tiene múltiples roles.
   * No incluye active_role — solo sirve para llamar a /auth/select-role.
   */
  private generateTempToken(
    user: { id: string; full_name: string; email: string; organization_id: string },
  ): string {
    const payload = {
      sub:             user.id,
      email:           user.email,
      full_name:       user.full_name,
      organization_id: user.organization_id,
      active_role:     'pending_role_selection',
    };
    // Token temporal con expiración corta — solo para seleccionar rol
    return this.jwt.sign(payload, { expiresIn: '5m' });
  }
}
