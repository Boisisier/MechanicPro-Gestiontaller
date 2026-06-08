CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  detail text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de registro de acciones para auditoria, con indices para consultas rapidas por empresa y fecha

CREATE TABLE IF NOT EXISTS parking_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  released_by text DEFAULT '',
  detail text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vehicle_id)
);
-- tabla para registrar liberaciones de vehiculos del estacionamiento, con indices para consultas rapidas por empresa y vehiculo

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_at
  ON audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parking_releases_company_vehicle
  ON parking_releases(company_id, vehicle_id);

UPDATE roles
SET modules = ARRAY['Dashboard', 'VehÃ­culos', 'Presupuesto', 'Inventario', 'Estacionamiento', 'Reportes', 'ConfiguraciÃ³n', 'Registro de acciones'],
    updated_at = now()
WHERE name = 'Administrador de Taller';

UPDATE roles
SET modules = ARRAY['Dashboard', 'VehÃ­culos', 'Presupuesto', 'Estacionamiento', 'Reportes'],
    updated_at = now()
WHERE name = 'Administrativo';

UPDATE roles
SET modules = ARRAY['Dashboard', 'VehÃ­culos', 'Estacionamiento', 'Reportes'],
    updated_at = now()
WHERE name = 'MecÃ¡nico';
