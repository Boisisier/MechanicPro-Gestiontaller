ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS attention_priority text NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS estimated_work_hours numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promised_delivery_date date,
  ADD COLUMN IF NOT EXISTS customer_authorized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_authorized_at timestamptz;

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_attention_priority_check,
  DROP CONSTRAINT IF EXISTS vehicles_estimated_work_hours_nonnegative;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_attention_priority_check
    CHECK (attention_priority IN ('Baja', 'Normal', 'Alta', 'Urgente')),
  ADD CONSTRAINT vehicles_estimated_work_hours_nonnegative
    CHECK (estimated_work_hours >= 0);

UPDATE vehicles
SET customer_authorized_at = COALESCE(customer_authorized_at, updated_at, now())
WHERE customer_authorized = true;
