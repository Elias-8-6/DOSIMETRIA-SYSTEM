import 'multer';
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET_NAME = 'receptions';

@Injectable()
export class UploadReceptionPhotoUseCase {
  private readonly logger = new Logger(UploadReceptionPhotoUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    file: Express.Multer.File,
    organizationId: string,
  ): Promise<{ url: string }> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede cargar fotos de recepción');
    }

    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato de archivo no válido. Solo se admiten JPG, PNG y WebP.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El tamaño del archivo supera el límite permitido de 5 MB');
    }

    const client = this.supabase.getClient();

    // Asegurar que el bucket exista
    try {
      const { data: buckets } = await client.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        await client.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });
      }
    } catch (err) {
      this.logger.warn(`Nota al verificar bucket ${BUCKET_NAME}:`, err);
    }

    const fileExt = file.originalname?.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const storagePath = `evidence/${cleanFileName}`;

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      this.logger.error('Error al subir la fotografía de recepción a Supabase Storage:', uploadError);
      throw new Error('Error al almacenar la fotografía de recepción');
    }

    const { data: publicData } = client.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    const photoUrl = publicData.publicUrl.replace('host.docker.internal', 'localhost');
    return { url: photoUrl };
  }
}
