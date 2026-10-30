#!/usr/bin/env python3
import os

REPLACEMENTS = {
    "frontend-web/src/pages/users/UsersPage.tsx": [
        ('title="Usuarios"', 'title="Personal de Laboratorio"'),
        ('subtitle="Gestión de usuarios del sistema"', 'subtitle="Gestión de analistas y personal técnico del laboratorio (ISO 17025)"'),
        ('>Nuevo usuario<', '>+ Nuevo Personal / Analista<'),
        ("showToast(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');",
         "showToast(editingUser ? 'Personal de laboratorio actualizado correctamente' : 'Personal de laboratorio registrado correctamente');"),
        ('Cargando usuarios...', 'Cargando personal de laboratorio...'),
        ('No se encontraron usuarios', 'No se encontró personal de laboratorio'),
    ],
    "frontend-web/src/pages/users/UserDetailPage.tsx": [
        ('Volver a usuarios', 'Volver a Personal de Laboratorio'),
        ('Usuario no encontrado', 'Personal de laboratorio no encontrado'),
        ('Desactivar usuario', 'Desactivar personal'),
        ('Activar usuario', 'Activar personal'),
        ('Cargando detalle del usuario...', 'Cargando detalle del personal...'),
    ],
    "frontend-web/src/components/users/UserFormModal.tsx": [
        ("title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}",
         "title={isEditing ? 'Editar Personal de Laboratorio' : 'Nuevo Personal / Analista'}"),
        (": 'Crear usuario'}", ": 'Registrar personal'}"),
    ],
    "frontend-web/src/pages/workers/WorkersPage.tsx": [
        ('title="Trabajadores"', 'title="Personal Ocupacionalmente Expuesto (POE)"'),
        ('subtitle="Gestión de trabajadores dosimetrados"', 'subtitle="Control regulatorio Minsa de personal expuesto a radiaciones ionizantes"'),
        ('>Nuevo trabajador<', '>+ Nuevo POE<'),
        ("formModal.worker ? 'Trabajador actualizado correctamente' : 'Trabajador creado correctamente'",
         "formModal.worker ? 'Personal POE actualizado correctamente' : 'Personal POE registrado correctamente'"),
        ('Cargando trabajadores...', 'Cargando personal POE...'),
        ('No se encontraron trabajadores', 'No se encontró personal POE registrado'),
        ('Buscar por nombre, documento o código...', 'Buscar POE por nombre, DNI o código...'),
    ],
    "frontend-web/src/components/workers/WorkerFormModal.tsx": [
        ("title={isEditing ? 'Editar trabajador' : 'Nuevo trabajador'}",
         "title={isEditing ? 'Editar Personal POE' : 'Nuevo Personal Ocupacionalmente Expuesto (POE)'}"),
        (": 'Crear trabajador'}", ": 'Registrar POE'}"),
        ('placeholder="trabajador@institucion.com"', 'placeholder="poe@institucion.com"'),
    ],
    "frontend-web/src/components/workers/WorkerDetailModal.tsx": [
        ("'Desactivar trabajador' : 'Activar trabajador'", "'Desactivar POE' : 'Activar POE'"),
        ('title="Detalle del trabajador"', 'title="Ficha Técnica del POE"'),
    ],
    "frontend-web/src/pages/clients/ClientDetailPage.tsx": [
        ('+ Agregar trabajador', '+ Registrar POE'),
        ('+ Trabajador', '+ POE'),
        ("showToast('Trabajador creado correctamente')", "showToast('Personal POE registrado correctamente')"),
        ('Sus departamentos y trabajadores seguirán existiendo', 'Sus departamentos y personal POE seguirán existiendo'),
    ],
    "frontend-web/src/components/dosimeters/AssignDosimeterModal.tsx": [
        ("setError('Seleccioná un trabajador');", "setError('Seleccioná un personal POE');"),
        ('label="Buscar trabajador"', 'label="Buscar POE"'),
        ('label="Trabajador"', 'label="Personal Ocupacionalmente Expuesto (POE)"'),
        ('Seleccionar trabajador', 'Seleccionar POE'),
    ],
    "frontend-web/src/pages/service-orders/CreateServiceOrderPage.tsx": [
        ('PIN, Usuario asignado, Cédula/ID', 'PIN, Personal POE asignado, Cédula/ID'),
        ('previamente a sus trabajadores', 'previamente a su personal POE'),
        ("cd.worker?.full_name || 'Sin usuario asignado'", "cd.worker?.full_name || 'Sin POE asignado'"),
        ('Asignado a trabajador', 'Asignado a personal POE'),
        ('<th className="py-2.5 px-3">Usuario asignado</th>', '<th className="py-2.5 px-3">Personal POE asignado</th>'),
    ],
    "frontend-web/src/pages/service-orders/ServiceOrderDetailPage.tsx": [
        ('Control / Sin usuario', 'Control / Sin POE asignado'),
    ],
    "frontend-web/src/pages/reports/ReportsPage.tsx": [
        ('Trabajador POE', 'Personal POE'),
        ('Seleccionar Trabajador POE', 'Seleccionar Personal POE'),
        ('historial del trabajador', 'historial del POE'),
        ('retiro preventivo del trabajador', 'retiro preventivo del POE'),
    ],
}

def main():
    for rel_path, pairs in REPLACEMENTS.items():
        if not os.path.exists(rel_path):
            print(f"Skipping {rel_path} (not found)")
            continue
        with open(rel_path, "r", encoding="utf-8") as f:
            content = f.read()

        updated = content
        count = 0
        for src, dst in pairs:
            if src in updated:
                updated = updated.replace(src, dst)
                count += 1
            else:
                print(f"  [MISS] Could not find '{src[:40]}' in {rel_path}")

        if count > 0:
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"[OK] Updated {count} occurrences in {rel_path}")

if __name__ == "__main__":
    main()
