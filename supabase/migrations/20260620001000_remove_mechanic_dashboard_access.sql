UPDATE roles
SET modules = ARRAY['Vehículos', 'Reportes'],
    updated_at = now()
WHERE name = 'Mecánico';
