-- PostgreSQL schema for vehicles
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Multi-tenant core
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_members_role_chk CHECK (role IN ('admin', 'mecanico', 'recepcionista')),
  CONSTRAINT company_members_unique UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name text,
  customer_rut text,
  customer_phone text,
  customer_address text,
  customer_city text,
  patente text NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer NOT NULL,
  tipo_vehiculo text NOT NULL,
  kilometraje integer NOT NULL DEFAULT 0,
  cantidad_combustible integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'En taller',
  servicios text[] NOT NULL DEFAULT '{}',
  observaciones text DEFAULT '',
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_estado_chk CHECK (estado IN ('En taller', 'En revision', 'Entregado')),
  CONSTRAINT vehicles_tipo_chk CHECK (tipo_vehiculo IN ('Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon')),
  CONSTRAINT vehicles_company_patente_unique UNIQUE (company_id, patente)
);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_role_chk CHECK (role IN ('admin', 'mecanico', 'recepcionista'))
);

CREATE TABLE IF NOT EXISTS support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_email text NOT NULL,
  token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_companies_updated_at ON companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_vehicles_updated_at ON vehicles;
CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_patente ON vehicles(patente);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_patente ON vehicles(company_id, patente);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_vehicles_fecha_ingreso ON vehicles(fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_support_sessions_company_id ON support_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_owner_email ON support_sessions(owner_email);
CREATE INDEX IF NOT EXISTS idx_support_sessions_token ON support_sessions(token);
