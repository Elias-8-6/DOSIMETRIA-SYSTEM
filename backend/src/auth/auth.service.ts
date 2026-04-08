import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../config/supabase.config';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
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

  async getProfile(user: JwtPayload) {
    const client = this.supabase.getClient();

    // Query 1: datos base del usuario
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id, full_name, email, status, created_at, organization_id')
      .eq('id', user.sub)
      .single();


    if (userError || !userData) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Query 2: organización
    const { data: orgData } = await client
      .from('organizations')
      .select('name')
      .eq('id', userData.organization_id)
      .single();

    // Query 3: roles del usuario
    const { data: rolesData, error: rolesError } = await client
      .from('user_roles')
      .select('roles(code, name)')
      .eq('user_id', user.sub);


    // Query 4: permisos activos del usuario
    const { data: permissionsData, error: permissionsError } = await client
      .from('user_permissions')
      .select('granted, permissions(code, module, action, description)')
      .eq('user_id', user.sub)
      .eq('granted', true);


    const roles = (rolesData ?? []).map((ur: any) => ur.roles);
    const permissions = (permissionsData ?? []).map((up: any) => up.permissions);

    return {
      id:           userData.id,
      full_name:    userData.full_name,
      email:        userData.email,
      status:       userData.status,
      organization: orgData?.name ?? null,
      roles,
      permissions,
    };
  }

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
