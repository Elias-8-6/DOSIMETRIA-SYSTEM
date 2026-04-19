import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { SupabaseService } from "@config/supabase.config";
import { JwtPayload } from "@common/interfaces/jwt-payload.interface";
import { LoginDto } from "./dto/login.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data: user, error } = await client
      .from("users")
      .select("id, full_name, email, password_hash, organization_id, status")
      .eq("email", dto.email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException("Credenciales incorrectas");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("El usuario está inactivo o bloqueado");
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException("Credenciales incorrectas");
    }

    const { data: userRoles } = await client
      .from("user_roles")
      .select("roles(code, name)")
      .eq("user_id", user.id);

    if (!userRoles?.length) {
      throw new ForbiddenException("El usuario no tiene roles asignados");
    }

    const token = this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(
      user.id,
      user.organization_id,
    );

    return {
      access_token: token,
      refresh_token: refreshToken,
    };
  }

  async getProfile(user: JwtPayload) {
    const client = this.supabase.getClient();

    // Query 1: datos base del usuario
    const { data: userData, error: userError } = await client
      .from("users")
      .select("id, full_name, email, status, created_at, organization_id")
      .eq("id", user.sub)
      .single();

    if (userError || !userData) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Query 2: organización
    const { data: orgData } = await client
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    // Query 3: roles del usuario
    const { data: rolesData, error: rolesError } = await client
      .from("user_roles")
      .select("roles(code, name)")
      .eq("user_id", user.sub);

    // Query 4: permisos activos del usuario
    const { data: permissionsData, error: permissionsError } = await client
      .from("user_permissions")
      .select("granted, permissions(code, module, action, description)")
      .eq("user_id", user.sub)
      .eq("granted", true);

    const roles = (rolesData ?? []).map((ur: any) => ur.roles);
    const permissions = (permissionsData ?? []).map(
      (up: any) => up.permissions,
    );

    return {
      id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      status: userData.status,
      organization: orgData?.name ?? null,
      roles,
      permissions,
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

  private async generateRefreshToken(
    userId: string,
    organizationId: string,
  ): Promise<string> {
    // Generar el token como JWT firmado con el refresh secret
    const refreshToken = this.jwt.sign(
      { sub: userId, organization_id: organizationId }, // payload mínimo — solo necesita el user_id
      {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", "7d"),
      },
    );

    // Hashear y guardar en DB igual que antes
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.supabase.getClient().from("refresh_tokens").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

    return refreshToken;
  }

  async refreshToken(userId: string, refreshToken: string) {
    const { data: tokens } = await this.supabase
      .getClient()
      .from("refresh_tokens")
      .select("id, token_hash, expires_at, revoked")
      .eq("user_id", userId)
      .eq("revoked", false);

    if (!tokens?.length) {
      throw new UnauthorizedException(
        "Sesión expirada - iniciá sesión nuevamente",
      );
    }

    let matchingToken = null;
    for (const token of tokens) {
      const matches = await bcrypt.compare(refreshToken, token.token_hash);
      if (matches) {
        matchingToken = token;
        break;
      }
    }

    if (!matchingToken) {
      throw new UnauthorizedException("Refresh token inválido");
    }

    const now = new Date();
    const expiresAt = new Date(matchingToken.expires_at);
    if (now > expiresAt) {
      throw new UnauthorizedException(
        "Refresh token expirado -- Inicia sesión Nuevamente",
      );
    }

    await this.supabase
      .getClient()
      .from("refresh_tokens")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", matchingToken.id);

    const { data: user } = await this.supabase
      .getClient()
      .from("users")
      .select("id, full_name, email, organization_id, status")
      .eq("id", userId)
      .single();

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Usuario inactivo");
    }

    // 7 — Generar nuevo par de tokens
    const newAccessToken = this.generateToken(user);
    const newRefreshToken = await this.generateRefreshToken(
      userId,
      user.organization_id,
    );

    // 8 — Retornar ambos tokens al cliente
    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    // Revocar TODOS los refresh tokens activos del usuario
    // Usamos "todos" en lugar de uno específico porque el usuario
    // puede tener sesiones abiertas en múltiples dispositivos
    // y el logout debería cerrarlas todas
    await this.supabase
      .getClient()
      .from("refresh_tokens")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("revoked", false);

    // El access_token sigue siendo válido hasta que expire (8h)
    // Esto es una limitación conocida de los JWT stateless
    // En producción se puede mitigar con tokens de vida corta (15min)
    return { message: "Sesión cerrada correctamente" };
  }
}
