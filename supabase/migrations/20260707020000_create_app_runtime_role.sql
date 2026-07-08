-- El servidor debe conectarse con un rol que NO tenga el atributo BYPASSRLS: el rol por
-- defecto de Supabase ("postgres") sí lo tiene, así que ninguna policy de RLS lo afecta sin
-- importar FORCE ROW LEVEL SECURITY. Este rol es de solo lectura/escritura de datos (DML), sin
-- permisos de DDL: crear/alterar tablas queda exclusivamente en migraciones versionadas.
--
-- La contraseña se fija por separado (fuera de git) con ALTER ROLE ... WITH PASSWORD.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSE
    ALTER ROLE app_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
