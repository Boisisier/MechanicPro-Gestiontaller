ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS salida_confirmada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_salida_confirmada timestamptz,
  ADD COLUMN IF NOT EXISTS en_estacionamiento_manual boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_company_salida_confirmada
  ON vehicles(company_id, salida_confirmada);

CREATE INDEX IF NOT EXISTS idx_vehicles_company_estacionamiento_manual
  ON vehicles(company_id, en_estacionamiento_manual);
