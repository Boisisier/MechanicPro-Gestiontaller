CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  modules text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS workshop_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  role_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS budget_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_quote_id uuid NOT NULL REFERENCES budget_quotes(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS vehicles
  ADD COLUMN IF NOT EXISTS codigo_vin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS codigo_motor text DEFAULT '',
  ADD COLUMN IF NOT EXISTS color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_mechanic_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_mechanic_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fallas_detectadas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comentario_tecnico text DEFAULT '';

UPDATE vehicles SET fallas_detectadas = '{}' WHERE fallas_detectadas IS NULL;
ALTER TABLE IF EXISTS vehicles ALTER COLUMN fallas_detectadas SET DEFAULT '{}';
ALTER TABLE IF EXISTS vehicles ALTER COLUMN fallas_detectadas SET NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_roles_updated_at ON roles;
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_workshop_users_updated_at ON workshop_users;
CREATE TRIGGER set_workshop_users_updated_at
  BEFORE UPDATE ON workshop_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_budget_quotes_updated_at ON budget_quotes;
CREATE TRIGGER set_budget_quotes_updated_at
  BEFORE UPDATE ON budget_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_workshop_users_company_id ON workshop_users(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON inventory_items(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_company_sku_unique
  ON inventory_items(company_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_company_barcode_unique
  ON inventory_items(company_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS idx_budget_quotes_company_id ON budget_quotes(company_id);
