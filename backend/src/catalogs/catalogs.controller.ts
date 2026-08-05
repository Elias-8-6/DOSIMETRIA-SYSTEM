import { Controller, Get } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';

/**
 * Catálogos de solo lectura compartidos entre módulos (dosimeters hoy;
 * service_orders/receptions a futuro). Solo requieren sesión válida
 * (JwtGuard global) — no ameritan un permiso granular propio, igual que
 * hoy no existe uno dedicado para leer client_locations sueltas.
 */
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('dosimeter-types')
  getDosimeterTypes() {
    return this.catalogsService.getDosimeterTypes();
  }

  @Get('dosimeter-statuses')
  getDosimeterStatuses() {
    return this.catalogsService.getDosimeterStatuses();
  }
}
