ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS customer_advance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_customer_advance_nonnegative;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_customer_advance_nonnegative
  CHECK (customer_advance >= 0);
