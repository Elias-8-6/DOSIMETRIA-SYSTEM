import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.config';
import { PermissionsCacheService } from '@common/services/permissions-cache.service';
import { AuditService } from '@common/services/audit.service';

/**
 * Módulo global: Supabase + servicios transversales de seguridad.
 */
@Global()
@Module({
  providers: [SupabaseService, PermissionsCacheService, AuditService],
  exports: [SupabaseService, PermissionsCacheService, AuditService],
})
export class SupabaseModule {}
