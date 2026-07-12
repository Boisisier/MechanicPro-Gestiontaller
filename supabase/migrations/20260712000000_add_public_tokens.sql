-- Link público (sin login) para que el cliente del taller vea el estado de su vehículo y
-- apruebe/rechace un presupuesto. Dos tokens independientes: budget_quotes.converted_vehicle_id
-- solo se completa después de que un presupuesto se aprueba y se convierte, así que durante el
-- estado "enviado" (esperando respuesta) no hay ningún vínculo confiable entre un presupuesto y
-- un vehículo.
--
-- gen_random_uuid() como default es volátil: Postgres reescribe la tabla y genera un token
-- distinto por cada fila ya existente, no hace falta backfill aparte.

alter table vehicles add column if not exists public_token uuid not null default gen_random_uuid();
alter table budget_quotes add column if not exists public_token uuid not null default gen_random_uuid();
alter table budget_quotes add column if not exists customer_responded_at timestamptz;

create unique index if not exists vehicles_public_token_key on vehicles (public_token);
create unique index if not exists budget_quotes_public_token_key on budget_quotes (public_token);

-- Bypass de solo lectura, acotado a una transacción, para resolver token -> company_id antes de
-- conocer la empresa (mismo patrón que tenant_isolation_login_lookup en
-- 20260707000000_enable_row_level_security.sql, con su propio flag para no mezclar los dos
-- casos de uso). El token es un UUID v4 (122 bits) y la query de la app siempre filtra por
-- public_token, así que en la práctica solo devuelve una fila a quien ya tiene el token exacto.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['vehicles', 'budget_quotes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_public_lookup ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_public_lookup ON %I ' ||
      'FOR SELECT USING (current_setting(''app.public_lookup'', true) = ''on'')',
      tbl
    );
  END LOOP;
END $$;
