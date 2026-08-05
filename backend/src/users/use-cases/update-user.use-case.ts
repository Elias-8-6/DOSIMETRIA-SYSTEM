import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    userId: string,
    dto: UpdateUserDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const id = userId;
    const client = this.supabase.getClient();

    // Verificar que el usuario existe en la misma organización
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException(`Usuario ${id} no encontrado`);

    // Verificar unicidad de document_number si se está cambiando
    if (dto.document_number) {
      const { data: docConflict } = await client
        .from('users')
        .select('id')
        .eq('document_number', dto.document_number)
        .neq('id', id)
        .maybeSingle();

      if (docConflict) {
        throw new ConflictException(
          `El número de documento '${dto.document_number}' ya está registrado`,
        );
      }
    }

    // Verificar unicidad de email si se está cambiando
    if (dto.email) {
      const { data: emailConflict } = await client
        .from('users')
        .select('id')
        .eq('email', dto.email)
        .neq('id', id)
        .maybeSingle();

      if (emailConflict) {
        throw new ConflictException(`El email '${dto.email}' ya está registrado`);
      }
    }

    const { data, error } = await client
      .from('users')
      .update({
        ...(dto.full_name !== undefined && { full_name: dto.full_name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.degree_title !== undefined && { degree_title: dto.degree_title }),
        ...(dto.university !== undefined && { university: dto.university }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.document_number !== undefined && { document_number: dto.document_number }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.date_of_birth !== undefined && { date_of_birth: dto.date_of_birth }),
        ...(dto.hire_date !== undefined && { hire_date: dto.hire_date }),
      })
      .eq('id', id)
      .select(
        `
        id, full_name, email, status, created_at,
        degree_title, university, location,
        document_number, phone, date_of_birth, hire_date
      `,
      )
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (dto.role_code) {
      const { data: role } = await client
        .from('roles')
        .select('id')
        .eq('code', dto.role_code)
        .maybeSingle();

      if (!role) throw new NotFoundException(`El rol '${dto.role_code}' no existe`);

      // Eliminar rol actual y asignar el nuevo
      await client.from('user_roles').delete().eq('user_id', userId);

      await client.from('user_roles').insert({
        user_id: userId,
        role_id: role.id,
      });
    }

    // Audit log
    await client.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'users',
      entity_id: userId,
      action: 'UPDATE',
      new_values: dto,
    });

    return data;
  }
}
