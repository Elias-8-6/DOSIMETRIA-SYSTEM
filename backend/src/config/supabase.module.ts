import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.config';
import { PermissionsCacheService } from '@common/services/permissions-cache.service';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

/**
 * Módulo global: Supabase + servicios transversales de seguridad.
 */
@Global()
@Module({
  providers: [SupabaseService, PermissionsCacheService, AuditService, OrganizationScopeService],
  exports: [SupabaseService, PermissionsCacheService, AuditService, OrganizationScopeService],
})
export class SupabaseModule {}
