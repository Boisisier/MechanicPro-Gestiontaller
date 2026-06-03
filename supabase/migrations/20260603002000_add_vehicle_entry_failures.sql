ALTER TABLE IF EXISTS vehicles
  ADD COLUMN IF NOT EXISTS fallas_detectadas text[] NOT NULL DEFAULT '{}';

ALTER TABLE IF EXISTS ingreso
  ADD COLUMN IF NOT EXISTS fallas_detectadas text[] NOT NULL DEFAULT '{}';
