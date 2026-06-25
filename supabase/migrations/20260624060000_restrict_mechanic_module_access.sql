UPDATE roles
SET modules = ARRAY[
      'Dashboard',
      'Vehículos',
      'Presupuesto',
      'Inventario',
      'Estacionamiento',
      'Reportes',
      'Configuración',
      'Registro de acciones'
    ],
    updated_at = now()
WHERE name = 'Administrador de Taller';

UPDATE roles
SET modules = ARRAY[
      'Dashboard',
      'Vehículos',
      'Presupuesto',
      'Estacionamiento',
      'Reportes'
    ],
    updated_at = now()
WHERE name = 'Administrativo';

UPDATE roles
SET modules = ARRAY['Vehículos', 'Reportes'],
    updated_at = now()
WHERE name IN ('Mecánico', 'Mecanico', 'MecÃ¡nico');
