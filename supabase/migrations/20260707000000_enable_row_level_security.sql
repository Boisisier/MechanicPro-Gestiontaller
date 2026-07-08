-- Aislamiento multi-tenant real vía Row Level Security.
-- Hasta ahora el aislamiento entre empresas dependía 100% de que cada
-- query de la app incluyera company_id manualmente. Esto lo hace exigible
-- a nivel de base de datos: incluso una query con un bug no puede leer ni
-- escribir filas de otra empresa.
--
-- El servidor (server/index.js) fija app.current_company_id en cada
-- conexión antes de correr un query real, a partir del company_id del JWT.
-- Si no hay contexto, usamos un UUID centinela que no coincide con ninguna
-- empresa real, así que el default es "no ver nada" (fail closed).

-- Tablas estándar: aislamiento directo por company_id.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vehicles', 'vehicle_services', 'inventory_items', 'inventory_movements',
    'inventory_suppliers', 'inventory_purchase_orders', 'inventory_stock_counts',
    'budget_quotes', 'service_catalog', 'service_categories', 'audit_logs',
    'parking_releases'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I ' ||
      'USING (company_id = current_setting(''app.current_company_id'', true)::uuid) ' ||
      'WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      tbl
    );
  END LOOP;
END $$;

-- Tablas que además participan en la búsqueda de login por email (antes de
-- conocer la empresa): permiten un bypass de solo lectura, transaccional,
-- activado únicamente por /auth/login justo antes de esas dos queries.
-- Las escrituras (INSERT/UPDATE/DELETE) nunca usan el bypass.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['company_members', 'workshop_users', 'roles']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_login_lookup ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I ' ||
      'USING (company_id = current_setting(''app.current_company_id'', true)::uuid) ' ||
      'WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_login_lookup ON %I ' ||
      'FOR SELECT USING (current_setting(''app.login_lookup'', true) = ''on'')',
      tbl
    );
  END LOOP;
END $$;

-- Tablas hijas sin company_id propio: heredan el aislamiento vía EXISTS
-- contra la tabla padre, que ya tiene RLS aplicado.
ALTER TABLE budget_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_quote_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON budget_quote_items;
CREATE POLICY tenant_isolation ON budget_quote_items
  USING (EXISTS (
    SELECT 1 FROM budget_quotes bq WHERE bq.id = budget_quote_items.budget_quote_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_quotes bq WHERE bq.id = budget_quote_items.budget_quote_id
  ));

ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_purchase_order_items;
CREATE POLICY tenant_isolation ON inventory_purchase_order_items
  USING (EXISTS (
    SELECT 1 FROM inventory_purchase_orders po
    WHERE po.id = inventory_purchase_order_items.purchase_order_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_purchase_orders po
    WHERE po.id = inventory_purchase_order_items.purchase_order_id
  ));

ALTER TABLE inventory_stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_count_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_stock_count_items;
CREATE POLICY tenant_isolation ON inventory_stock_count_items
  USING (EXISTS (
    SELECT 1 FROM inventory_stock_counts sc
    WHERE sc.id = inventory_stock_count_items.stock_count_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_stock_counts sc
    WHERE sc.id = inventory_stock_count_items.stock_count_id
  ));
