UPDATE roles
SET name = 'Mecánico',
    modules = array_replace(
      array_replace(modules, 'VehÃ­culos', 'Vehículos'),
      'ConfiguraciÃ³n',
      'Configuración'
    ),
    updated_at = now()
WHERE name = 'MecÃ¡nico'
   OR 'VehÃ­culos' = ANY(modules)
   OR 'ConfiguraciÃ³n' = ANY(modules);

UPDATE workshop_users
SET role_name = 'Mecánico',
    updated_at = now()
WHERE role_name = 'MecÃ¡nico';
