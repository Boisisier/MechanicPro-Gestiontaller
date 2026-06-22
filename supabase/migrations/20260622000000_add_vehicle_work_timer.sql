ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS work_timer_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_elapsed_seconds bigint NOT NULL DEFAULT 0;

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_work_elapsed_seconds_nonnegative;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_work_elapsed_seconds_nonnegative
  CHECK (work_elapsed_seconds >= 0);

UPDATE vehicles
SET work_timer_started_at = COALESCE(updated_at, now())
WHERE estado = 'En Taller'
  AND work_timer_started_at IS NULL
  AND (assigned_mechanic_id IS NOT NULL OR assigned_mechanic_name <> '');

CREATE INDEX IF NOT EXISTS idx_vehicles_work_timer_started_at
  ON vehicles(company_id, work_timer_started_at)
  WHERE work_timer_started_at IS NOT NULL;
