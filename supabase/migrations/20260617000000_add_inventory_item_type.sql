ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'repuesto';

UPDATE inventory_items
SET item_type = 'repuesto'
WHERE item_type IS NULL OR item_type NOT IN ('repuesto', 'insumo');

