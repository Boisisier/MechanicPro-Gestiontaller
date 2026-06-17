ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_estado_check;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_estado_chk;

UPDATE vehicles
SET estado = 'Ingresado'
WHERE estado = 'En taller';

UPDATE vehicles
SET estado = 'En Taller'
WHERE estado = 'En revision';

ALTER TABLE vehicles
  ALTER COLUMN estado SET DEFAULT 'Ingresado';

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_estado_check
  CHECK (estado IN ('Ingresado', 'En Taller', 'Entregado'));

