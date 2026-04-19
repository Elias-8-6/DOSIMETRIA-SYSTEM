import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { SupabaseService } from "@config/supabase.config";
import { CreateUserDto } from "../dto/create-user.dto";

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  async execute(
      dto:            CreateUserDto,
      organizationId: string,
      grantedBy:      string
  ) {
    const client = this.supabase.getClient();


    // Verificar que el email no exista en la organización
    const { data: existingUser } = await client
      .from("users")
      .select("id")
      .eq("email", dto.email)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException(
        `El email '${dto.email}' ya está registrado en esta organización`,
      );
    }

    // Verificar que el rol existe (si viene en el DTO)
    let roleId: string | null = null;

    if (dto.role_code) {
      const { data: role } = await client
        .from("roles")
        .select("id")
        .eq("code", dto.role_code)
        .maybeSingle();

      if (!role) {
        throw new NotFoundException(
          `El rol '${dto.role_code}' no existe en el sistema`,
        );
      }

      roleId = role.id;
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crear el usuario
    const { data: newUser, error: createError } = await client
      .from("users")
      .insert({
        full_name: dto.full_name,
        email: dto.email,
        password_hash: passwordHash,
        organization_id: organizationId,
        status: "active",
      })
      .select("id, full_name, email, status, organization_id, created_at")
      // .select() excluye password_hash — nunca se retorna al cliente
      .single();

    if (createError || !newUser) {
      this.logger.error("Error al crear usuario:", createError);
      throw new Error("No se pudo crear el usuario");
    }

    // Asignar el rol si viene en el DTO
    if (roleId) {
      const { error: roleError } = await client.from("user_roles").insert({
        user_id: newUser.id,
        role_id: roleId,
      });

      if (roleError) {
        this.logger.error("Error al asignar rol:", roleError);
        // No revertimos el usuario creado — el admin puede asignar el rol después
        // desde el endpoint POST /users/:id/permissions
      }
    }

    // Registrar en audit_logs
    // ISO 17025: toda creación de usuario debe quedar registrada con:
    // quién lo creó, cuándo, y con qué datos (sin password_hash).
    await client.from("audit_logs").insert({
      user_id: grantedBy,
      entity_name: "users",
      entity_id: newUser.id,
      action: "CREATE",
      old_values: null,
      new_values: {
        full_name: newUser.full_name,
        email: newUser.email,
        status: newUser.status,
        role_code: dto.role_code ?? null,
      },
    });

    // Retornar el usuario creado
    return {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      status: newUser.status,
      created_at: newUser.created_at,
      role_code: dto.role_code ?? null,
    };
  }
}
