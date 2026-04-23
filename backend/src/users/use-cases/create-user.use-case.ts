import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '@config/supabase.config';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: CreateUserDto, organizationId: string, grantedBy: string) {
    const client = this.supabase.getClient();

    // Verificar que el email no exista
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException(
        `El email '${dto.email}' ya está registrado en esta organización`,
      );
    }

    // Verificar que el document_number no exista (si viene)
    if (dto.document_number) {
      const { data: existingDoc } = await client
        .from('users')
        .select('id')
        .eq('document_number', dto.document_number)
        .maybeSingle();

      if (existingDoc) {
        throw new ConflictException(
          `El número de documento '${dto.document_number}' ya está registrado`,
        );
      }
    }

    // Verificar que el rol existe — es obligatorio
    const { data: role } = await client
      .from('roles')
      .select('id')
      .eq('code', dto.role_code)
      .maybeSingle();

    if (!role) {
      throw new NotFoundException(`El rol '${dto.role_code}' no existe en el sistema`);
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crear el usuario con todos los campos
    const { data: newUser, error: createError } = await client
      .from('users')
      .insert({
        full_name:       dto.full_name,
        email:           dto.email,
        password_hash:   passwordHash,
        organization_id: organizationId,
        status:          'active',
        // Campos de perfil (migración 012)
        degree_title:    dto.degree_title    ?? null,
        university:      dto.university      ?? null,
        location:        dto.location        ?? null,
        // Campos nuevos (migración 013)
        document_number: dto.document_number ?? null,
        phone:           dto.phone           ?? null,
        date_of_birth:   dto.date_of_birth   ?? null,
        hire_date:       dto.hire_date        ?? null,
      })
      .select('id, full_name, email, status, organization_id, created_at')
      .single();

    if (createError || !newUser) {
      this.logger.error('Error al crear usuario:', createError);
      throw new Error('No se pudo crear el usuario');
    }

    // Asignar el rol — ahora lanza error si falla
    const { error: roleError } = await client.from('user_roles').insert({
      user_id: newUser.id,
      role_id: role.id,
    });

    if (roleError) {
      this.logger.error('Error al asignar rol:', roleError);
      throw new Error(
        'El usuario se creó pero no se pudo asignar el rol. Contacta al administrador.',
      );
    }

    // Audit log
    await client.from('audit_logs').insert({
      user_id:     grantedBy,
      entity_name: 'users',
      entity_id:   newUser.id,
      action:      'CREATE',
      old_values:  null,
      new_values: {
        full_name:       newUser.full_name,
        email:           newUser.email,
        status:          newUser.status,
        role_code:       dto.role_code,
        document_number: dto.document_number ?? null,
      },
    });

    return {
      id:         newUser.id,
      full_name:  newUser.full_name,
      email:      newUser.email,
      status:     newUser.status,
      created_at: newUser.created_at,
      role_code:  dto.role_code,
    };
  }
}
