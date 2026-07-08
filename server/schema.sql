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
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_price numeric(12,2) NOT NULL CHECK (base_price >= 0),
  estimated_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (estimated_hours >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS vehicle_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES service_catalog(id) ON DELETE SET NULL,
  service_name_snapshot text NOT NULL,
  unit_price_snapshot numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price_snapshot >= 0),
  estimated_hours_snapshot numeric(8,2) NOT NULL DEFAULT 0 CHECK (estimated_hours_snapshot >= 0),
  quantity numeric(8,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En proceso', 'Completado', 'Cancelado')),
  added_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, service_name_snapshot)
);
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
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'activo',
  supplier_id uuid,
  warehouse text NOT NULL DEFAULT '',
  aisle text NOT NULL DEFAULT '',
  shelf text NOT NULL DEFAULT '',
  bin text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- tabla de items de inventario, con indices para consultas rapidas por empresa, sku y codigo de barras
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  rut text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity numeric(12,2) NOT NULL,
  stock_before numeric(12,2) NOT NULL,
  stock_after numeric(12,2) NOT NULL,
  reason text NOT NULL DEFAULT '',
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_patente text NOT NULL DEFAULT '',
  mechanic_name text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  order_date date NOT NULL DEFAULT current_date,
  expected_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL,
  received_quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'abierto',
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS inventory_stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES inventory_stock_counts(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  expected_quantity numeric(12,2) NOT NULL,
  counted_quantity numeric(12,2) NOT NULL,
  difference numeric(12,2) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED
);
CREATE TABLE IF NOT EXISTS budget_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text DEFAULT '',
  patente text DEFAULT '',
  vehicle text DEFAULT '',
  customer_rut text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  customer_city text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  issue_date date NOT NULL DEFAULT current_date,
  expiry_date date,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 19,
  advance_required numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  terms text NOT NULL DEFAULT '',
  converted_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
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
  item_type text NOT NULL DEFAULT 'servicio',
  reference_id uuid,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  estimated_hours numeric(8,2) NOT NULL DEFAULT 0,
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

-- Aislamiento multi-tenant vía Row Level Security. Ver
-- supabase/migrations/20260707000000_enable_row_level_security.sql para la
-- versión aplicada realmente (este archivo es solo un espejo de referencia).
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vehicles', 'vehicle_services', 'inventory_items', 'inventory_movements',
    'inventory_suppliers', 'inventory_purchase_orders', 'inventory_stock_counts',
    'budget_quotes', 'service_catalog', 'service_categories', 'audit_logs',
    'parking_releases'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I ' ||
      'USING (company_id = current_setting(''app.current_company_id'', true)::uuid) ' ||
      'WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      tbl
    );
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['company_members', 'workshop_users', 'roles']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_login_lookup ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I ' ||
      'USING (company_id = current_setting(''app.current_company_id'', true)::uuid) ' ||
      'WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_login_lookup ON %I ' ||
      'FOR SELECT USING (current_setting(''app.login_lookup'', true) = ''on'')',
      tbl
    );
  END LOOP;
END $$;

ALTER TABLE budget_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_quote_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON budget_quote_items;
CREATE POLICY tenant_isolation ON budget_quote_items
  USING (EXISTS (
    SELECT 1 FROM budget_quotes bq WHERE bq.id = budget_quote_items.budget_quote_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_quotes bq WHERE bq.id = budget_quote_items.budget_quote_id
  ));

ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_purchase_order_items;
CREATE POLICY tenant_isolation ON inventory_purchase_order_items
  USING (EXISTS (
    SELECT 1 FROM inventory_purchase_orders po
    WHERE po.id = inventory_purchase_order_items.purchase_order_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_purchase_orders po
    WHERE po.id = inventory_purchase_order_items.purchase_order_id
  ));

ALTER TABLE inventory_stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_count_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_stock_count_items;
CREATE POLICY tenant_isolation ON inventory_stock_count_items
  USING (EXISTS (
    SELECT 1 FROM inventory_stock_counts sc
    WHERE sc.id = inventory_stock_count_items.stock_count_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_stock_counts sc
    WHERE sc.id = inventory_stock_count_items.stock_count_id
  ));
