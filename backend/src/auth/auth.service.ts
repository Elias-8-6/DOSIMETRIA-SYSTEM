import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../config/supabase.config';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * login()
   * Flujo simplificado:
   * 1. Busca el usuario por email
   * 2. Verifica la contraseña con bcrypt
   * 3. Genera el JWT directamente — sin selección de rol
   *
   * El JWT contiene: sub, email, full_name, organization_id.
   * Los permisos no van en el token — se consultan en DB
   * por PermissionsGuard en cada request que lo requiera.
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

    // Verificar que el usuario tenga al menos un rol asignado
    const { data: userRoles } = await client
      .from('user_roles')
      .select('roles(code, name)')
      .eq('user_id', user.id);

    if (!userRoles?.length) {
      throw new ForbiddenException('El usuario no tiene roles asignados');
    }

    // Generar JWT directamente — sin paso de selección de rol
    const token = this.generateToken(user);

    return {
      access_token: token,
      user: {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        roles:     userRoles.map((ur: any) => ur.roles),
      },
    };
  }

  /**
   * getProfile()
   * Retorna datos completos del usuario autenticado:
   * sus roles asignados y sus permisos activos.
   * La UI puede usar esto para mostrar el menú y las opciones
   * disponibles según los permisos del usuario.
   */
  async getProfile(user: JwtPayload) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('users')
      .select(`
        id,
        full_name,
        email,
        status,
        created_at,
        organizations ( name ),
        user_roles ( roles ( code, name ) ),
        user_permissions (
          granted,
          permissions ( code, module, action, description )
        )
      `)
      .eq('id', user.sub)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Filtrar solo permisos activos (granted = true)
    const activePermissions = (data.user_permissions as any[])
      .filter((up) => up.granted)
      .map((up) => up.permissions);

    return {
      id:           data.id,
      full_name:    data.full_name,
      email:        data.email,
      status:       data.status,
      organization: (data.organizations as any)?.name,
      roles:        (data.user_roles as any[]).map((ur) => ur.roles),
      permissions:  activePermissions,
    };
  }

  // ── Métodos privados ──────────────────────────────────────

  private generateToken(user: {
    id:              string;
    full_name:       string;
    email:           string;
    organization_id: string;
  }): string {
    const payload: JwtPayload = {
      sub:             user.id,
      email:           user.email,
      full_name:       user.full_name,
      organization_id: user.organization_id,
    };
    return this.jwt.sign(payload);
  }
}
