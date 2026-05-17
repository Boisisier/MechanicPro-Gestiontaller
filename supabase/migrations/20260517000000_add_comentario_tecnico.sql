ALTER TABLE IF EXISTS vehicles
  ADD COLUMN IF NOT EXISTS comentario_tecnico text DEFAULT '';

ALTER TABLE IF EXISTS ingreso
  ADD COLUMN IF NOT EXISTS comentario_tecnico text DEFAULT '';
