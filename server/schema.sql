CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- tablas para gestionar empresas, usuarios, roles, vehiculos, inventario y presupuestos en el taller mecanico
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de usuarios globales, con indices para consultas rapidas por email
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
-- tabla de miembros de empresa, con indices para consultas rapidas por empresa y usuario
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  modules text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
-- tabla de roles personalizados por empresa, con indices para consultas rapidas por empresa y nombre de rol
CREATE TABLE IF NOT EXISTS workshop_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  rut text NOT NULL DEFAULT '',
  email text NOT NULL,
  password_hash text NOT NULL DEFAULT '',
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  role_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);
-- tabla para gestionar usuarios del taller, con indices para consultas rapidas por empresa y email

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_rut text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_city text NOT NULL,
  customer_email text DEFAULT '',
  assigned_mechanic_id uuid,
  assigned_mechanic_name text DEFAULT '',
  customer_advance numeric(12,2) NOT NULL DEFAULT 0 CHECK (customer_advance >= 0),
  attention_priority text NOT NULL DEFAULT 'Normal' CHECK (attention_priority IN ('Baja', 'Normal', 'Alta', 'Urgente')),
  estimated_work_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (estimated_work_hours >= 0),
  promised_delivery_date date,
  customer_authorized boolean NOT NULL DEFAULT false,
  customer_authorized_at timestamptz,
  work_timer_started_at timestamptz,
  work_elapsed_seconds bigint NOT NULL DEFAULT 0 CHECK (work_elapsed_seconds >= 0),
  patente text NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer NOT NULL,
  tipo_vehiculo text NOT NULL DEFAULT 'Auto',
  codigo_vin text DEFAULT '',
  codigo_motor text DEFAULT '',
  color text DEFAULT '',
  kilometraje integer NOT NULL DEFAULT 0,
  cantidad_combustible integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'Ingresado',
  servicios text[] NOT NULL DEFAULT '{}',
  observaciones text DEFAULT '',
  comentario_tecnico text DEFAULT '',
  salida_confirmada boolean NOT NULL DEFAULT false,
  fecha_salida_confirmada timestamptz,
  en_estacionamiento_manual boolean NOT NULL DEFAULT false,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (estado IN ('Ingresado', 'En Taller', 'Entregado')),
  CHECK (tipo_vehiculo IN ('Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon'))
);
-- tabla de vehiculos en taller, con indices para consultas rapidas por empresa, patente, fecha de ingreso y estado
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'repuesto',
  name text NOT NULL,
  category text DEFAULT '',
  sku text DEFAULT '',
  barcode text DEFAULT '',
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidad',
  location text DEFAULT '',
  supplier text DEFAULT '',
  cost numeric(12,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de items de inventario, con indices para consultas rapidas por empresa, sku y codigo de barras
CREATE TABLE IF NOT EXISTS budget_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text DEFAULT '',
  patente text DEFAULT '',
  vehicle text DEFAULT '',
  notes text DEFAULT '',
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'borrador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de presupuestos y cotizaciones, con indices para consultas rapidas por empresa y estado
CREATE TABLE IF NOT EXISTS budget_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_quote_id uuid NOT NULL REFERENCES budget_quotes(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de items asociados a presupuestos, con indice para consultas rapidas por presupuesto
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
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_companies_updated_at ON companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--  triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_roles_updated_at ON roles;
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_workshop_users_updated_at ON workshop_users;
CREATE TRIGGER set_workshop_users_updated_at
  BEFORE UPDATE ON workshop_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--  triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_vehicles_updated_at ON vehicles;
CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--  triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--  triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
DROP TRIGGER IF EXISTS set_budget_quotes_updated_at ON budget_quotes;
CREATE TRIGGER set_budget_quotes_updated_at
  BEFORE UPDATE ON budget_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--  triggers para actualizar el campo updated_at automaticamente en cada tabla al modificar un registro
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_workshop_users_company_id ON workshop_users(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_patente ON vehicles(patente);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_patente_fecha ON vehicles(company_id, patente, fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON inventory_items(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_company_sku_unique
  ON inventory_items(company_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_company_barcode_unique
  ON inventory_items(company_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS idx_budget_quotes_company_id ON budget_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_at ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parking_releases_company_vehicle ON parking_releases(company_id, vehicle_id);
-- actualizacion de roles para incluir el nuevo modulo de registro de acciones en el taller
UPDATE roles
SET modules = ARRAY['Dashboard', 'VehÃ­culos', 'Presupuesto', 'Inventario', 'Estacionamiento', 'Reportes', 'ConfiguraciÃ³n', 'Registro de acciones'],
    updated_at = now()
WHERE name = 'Administrador de Taller';     

UPDATE roles
SET modules = ARRAY['Vehículos', 'Reportes'],
    updated_at = now()
WHERE name = 'Mecánico';

-- correccion final de roles y permisos por perfil
UPDATE roles
SET modules = ARRAY['Dashboard', 'Vehículos', 'Presupuesto', 'Inventario', 'Estacionamiento', 'Reportes', 'Configuración', 'Registro de acciones'],
    updated_at = now()
WHERE name = 'Administrador de Taller';

UPDATE roles
SET modules = ARRAY['Dashboard', 'Vehículos', 'Presupuesto', 'Estacionamiento', 'Reportes'],
    updated_at = now()
WHERE name = 'Administrativo';

UPDATE roles
SET modules = ARRAY['Vehículos', 'Reportes'],
    updated_at = now()
WHERE name IN ('Mecánico', 'Mecanico', 'MecÃ¡nico');
