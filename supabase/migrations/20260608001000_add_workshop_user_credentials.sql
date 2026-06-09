ALTER TABLE workshop_users
  ADD COLUMN IF NOT EXISTS rut text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_workshop_users_company_rut
  ON workshop_users(company_id, rut);
