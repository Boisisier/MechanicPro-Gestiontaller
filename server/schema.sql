CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres text NOT NULL,
  apellido_paterno text NOT NULL,
  apellido_materno text,
  email text UNIQUE NOT NULL,
  clave text NOT NULL,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  id_usuario uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_rol uuid NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT company_members_unique UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS rol (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  --CONSTRAINT company_members_role_chk CHECK (role IN ('admin', 'mecanico', 'recepcionista')),
)

CREATE TABLE IF NOT EXISTS cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nombres text NOT NULL,
  apellido_paterno text NOT NULL,
  apellido_materno text,
  rut text,
  telefono text,
  direccion text,
  ciudad text,
  email text,
)

CREATE TABLE IF NOT EXISTS tipo_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_vehiculo text NOT NULL,
  --CONSTRAINT vehicles_tipo_chk CHECK (tipo_vehiculo IN ('Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon')),
)

CREATE TABLE IF NOT EXISTS marca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
)

CREATE TABLE IF NOT EXISTS modelo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
)

CREATE TABLE IF NOT EXISTS vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  id_tipo_vehiculo uuid NOT NULL REFERENCES tipo_vehiculo(id) ON DELETE CASCADE,
  id_marca uuid NOT NULL REFERENCES marca(id) ON DELETE CASCADE,
  id_modelo uuid NOT NULL REFERENCES modelo(id) ON DELETE CASCADE,
  patente text NOT NULL,
  anio integer NOT NULL,
  codigo_vin text,
  codigo_motor text,  
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_company_patente_unique UNIQUE (company_id, patente)
);

CREATE TABLE IF NOT EXISTS estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
--CONSTRAINT vehicles_estado_chk CHECK (estado IN ('En taller', 'En revision', 'Entregado')),
)

CREATE TABLE IF NOT EXISTS ingreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  id_vehiculo uuid NOT NULL REFERENCES vehiculo(id) ON DELETE CASCADE,
  kilometraje integer NOT NULL DEFAULT 0,
  cantidad_combustible integer NOT NULL DEFAULT 0,
  id_estado uuid NOT NULL REFERENCES estado(id) ON DELETE CASCADE,
  servicios text[] NOT NULL DEFAULT '{}',
  observaciones text DEFAULT '',
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
)

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
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
  id_empresa uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
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

DROP TRIGGER IF EXISTS set_empresa_updated_at ON empresa;
CREATE TRIGGER set_empresa_updated_at
  BEFORE UPDATE ON empresa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_usuario_updated_at ON usuario;
CREATE TRIGGER set_usuario_updated_at
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_vehiculo_updated_at ON vehiculo;
CREATE TRIGGER set_vehiculo_updated_at
  BEFORE UPDATE ON vehiculo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_company_members_empresa_id ON company_members(id_empresa);
CREATE INDEX IF NOT EXISTS idx_company_members_usuario_id ON company_members(id_usuario);
CREATE INDEX IF NOT EXISTS idx_vehiculo_empresa_id ON vehicles(id_empresa);
CREATE INDEX IF NOT EXISTS idx_vehiculo_patente ON vehicles(patente);
CREATE INDEX IF NOT EXISTS idx_vehiculo_empresa_patente ON vehicles(id_empresa, patente);
CREATE INDEX IF NOT EXISTS idx_vehiculo_estado ON vehicles(estado);
--CREATE INDEX IF NOT EXISTS idx_vehiculo_fecha_ingreso ON vehicles(fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_empresa_id ON invitations(id_empresa);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_support_sessions_empresa_id ON support_sessions(id_empresa);
CREATE INDEX IF NOT EXISTS idx_support_sessions_owner_email ON support_sessions(owner_email);
CREATE INDEX IF NOT EXISTS idx_support_sessions_token ON support_sessions(token);
