import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(userId: string, dto: UpdateProfileDto) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const { data, error } = await this.supabase
      .getClient()
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
      })
      .eq('id', userId)
      .select(
        `
        id, full_name, email, status,
        degree_title, university, location,
        document_number, phone, date_of_birth, hire_date
      `,
      )
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
