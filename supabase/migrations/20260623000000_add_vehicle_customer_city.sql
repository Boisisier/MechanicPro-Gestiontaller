ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS customer_city text NOT NULL DEFAULT 'Sin ciudad';

UPDATE vehicles
SET customer_city = 'Sin ciudad'
WHERE customer_city IS NULL OR trim(customer_city) = '';
