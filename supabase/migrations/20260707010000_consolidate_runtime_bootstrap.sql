-- Hasta ahora server/index.js corría todo este DDL (ensureVehicleColumns) en cada arranque
-- del proceso. Es exactamente el mismo esquema que ya está aplicado en esta base (todo es
-- idempotente: create table if not exists / add column if not exists), así que este archivo
-- es un no-op aquí, pero deja el esquema completo versionado en migraciones y permite borrar
-- el bootstrap del arranque del servidor. Esto es necesario para que el servidor pueda conectar
-- con un rol restringido (sin permisos de DDL) en vez del rol postgres/admin.

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_name text not null,
  customer_rut text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_city text not null,
  customer_email text default '',
  assigned_mechanic_id uuid,
  assigned_mechanic_name text default '',
  customer_advance numeric(12,2) not null default 0 check (customer_advance >= 0),
  attention_priority text not null default 'Normal',
  estimated_work_hours numeric(8,2) not null default 0 check (estimated_work_hours >= 0),
  promised_delivery_date date,
  customer_authorized boolean not null default false,
  customer_authorized_at timestamptz,
  work_timer_started_at timestamptz,
  work_elapsed_seconds bigint not null default 0 check (work_elapsed_seconds >= 0),
  patente text not null,
  marca text not null,
  modelo text not null,
  ano integer not null,
  tipo_vehiculo text not null default 'Auto',
  codigo_vin text default '',
  codigo_motor text default '',
  color text default '',
  kilometraje integer not null default 0,
  cantidad_combustible integer not null default 0,
  estado text not null default 'Ingresado',
  servicios text[] not null default '{}',
  observaciones text default '',
  comentario_tecnico text default '',
  salida_confirmada boolean not null default false,
  fecha_salida_confirmada timestamptz,
  en_estacionamiento_manual boolean not null default false,
  fecha_ingreso timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists workshop_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  item_type text not null default 'repuesto',
  name text not null,
  rut text not null default '',
  email text not null,
  password_hash text not null default '',
  role_id uuid references roles(id) on delete set null,
  role_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text default '',
  sku text default '',
  barcode text default '',
  stock integer not null default 0,
  min_stock integer not null default 0,
  unit text not null default 'unidad',
  location text default '',
  supplier text default '',
  cost numeric(12,2) not null default 0,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_name text not null,
  customer_phone text default '',
  patente text default '',
  vehicle text default '',
  notes text default '',
  total numeric(12,2) not null default 0,
  status text not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_quote_items (
  id uuid primary key default gen_random_uuid(),
  budget_quote_id uuid not null references budget_quotes(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_name text not null,
  module text not null,
  action text not null,
  detail text default '',
  created_at timestamptz not null default now()
);

create table if not exists parking_releases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  released_by text default '',
  detail text default '',
  created_at timestamptz not null default now(),
  unique (company_id, vehicle_id)
);

alter table inventory_items
  add column if not exists sale_price numeric(12,2) not null default 0,
  add column if not exists status text not null default 'activo',
  add column if not exists supplier_id uuid,
  add column if not exists warehouse text not null default '',
  add column if not exists aisle text not null default '',
  add column if not exists shelf text not null default '',
  add column if not exists bin text not null default '';

create table if not exists inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null, rut text not null default '', phone text not null default '',
  email text not null default '', address text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null, quantity numeric(12,2) not null,
  stock_before numeric(12,2) not null, stock_after numeric(12,2) not null,
  reason text not null default '', vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_patente text not null default '', mechanic_name text not null default '',
  user_name text not null default '', created_at timestamptz not null default now()
);

create table if not exists inventory_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  supplier_id uuid references inventory_suppliers(id) on delete set null,
  order_number text not null, status text not null default 'pendiente',
  order_date date not null default current_date, expected_date date,
  notes text not null default '', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (company_id, order_number)
);

create table if not exists inventory_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references inventory_purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete restrict,
  quantity numeric(12,2) not null, received_quantity numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0
);

create table if not exists inventory_stock_counts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'abierto', notes text not null default '',
  created_by text not null default '', created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists inventory_stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references inventory_stock_counts(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  expected_quantity numeric(12,2) not null, counted_quantity numeric(12,2) not null
);

alter table budget_quotes
  add column if not exists customer_rut text not null default '',
  add column if not exists customer_email text not null default '',
  add column if not exists customer_address text not null default '',
  add column if not exists customer_city text not null default '',
  add column if not exists issue_date date not null default current_date,
  add column if not exists expiry_date date,
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists tax_percent numeric(5,2) not null default 19,
  add column if not exists advance_required numeric(12,2) not null default 0,
  add column if not exists payment_method text not null default '',
  add column if not exists terms text not null default '',
  add column if not exists converted_vehicle_id uuid references vehicles(id) on delete set null;

alter table budget_quote_items
  add column if not exists item_type text not null default 'servicio',
  add column if not exists reference_id uuid,
  add column if not exists quantity numeric(10,2) not null default 1,
  add column if not exists unit_price numeric(12,2) not null default 0,
  add column if not exists estimated_hours numeric(8,2) not null default 0;

update budget_quote_items
set unit_price = price
where unit_price = 0 and price > 0;

create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists service_catalog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  category_id uuid not null references service_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text not null default '',
  base_price numeric(12,2) not null check (base_price >= 0),
  estimated_hours numeric(8,2) not null default 0 check (estimated_hours >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (company_id, name)
);

create table if not exists vehicle_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  service_id uuid references service_catalog(id) on delete set null,
  service_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null default 0 check (unit_price_snapshot >= 0),
  estimated_hours_snapshot numeric(8,2) not null default 0 check (estimated_hours_snapshot >= 0),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  status text not null default 'Pendiente',
  added_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, service_name_snapshot)
);

alter table vehicles
  add column if not exists codigo_vin text,
  add column if not exists codigo_motor text,
  add column if not exists color text default '',
  add column if not exists customer_city text not null default 'Sin ciudad',
  add column if not exists customer_email text default '',
  add column if not exists assigned_mechanic_id uuid,
  add column if not exists assigned_mechanic_name text default '',
  add column if not exists customer_advance numeric(12,2) not null default 0,
  add column if not exists attention_priority text not null default 'Normal',
  add column if not exists estimated_work_hours numeric(8,2) not null default 0,
  add column if not exists promised_delivery_date date,
  add column if not exists customer_authorized boolean not null default false,
  add column if not exists customer_authorized_at timestamptz,
  add column if not exists work_timer_started_at timestamptz,
  add column if not exists work_elapsed_seconds bigint not null default 0,
  add column if not exists comentario_tecnico text default '',
  add column if not exists salida_confirmada boolean not null default false,
  add column if not exists fecha_salida_confirmada timestamptz,
  add column if not exists en_estacionamiento_manual boolean not null default false;

alter table vehicles drop column if exists fallas_detectadas;
alter table vehicles drop constraint if exists vehicles_attention_priority_check;
alter table vehicles drop constraint if exists vehicles_estimated_work_hours_nonnegative;
alter table vehicles
  add constraint vehicles_attention_priority_check
    check (attention_priority in ('Baja', 'Normal', 'Alta', 'Urgente')),
  add constraint vehicles_estimated_work_hours_nonnegative
    check (estimated_work_hours >= 0);

alter table vehicles drop constraint if exists vehicles_estado_check;
alter table vehicles drop constraint if exists vehicles_estado_chk;
update vehicles set estado = 'Ingresado' where estado = 'En taller';
update vehicles set estado = 'En Taller' where estado = 'En revision';
alter table vehicles alter column estado set default 'Ingresado';
alter table vehicles
  add constraint vehicles_estado_check
  check (estado in ('Ingresado', 'En Taller', 'Entregado'));

alter table workshop_users
  add column if not exists rut text not null default '',
  add column if not exists password_hash text not null default '';

update roles
set name = 'Mecánico',
    modules = array_replace(array_replace(modules, 'VehÃ­culos', 'Vehículos'), 'ConfiguraciÃ³n', 'Configuración'),
    updated_at = now()
where name = 'MecÃ¡nico'
   or 'VehÃ­culos' = any(modules)
   or 'ConfiguraciÃ³n' = any(modules);

update workshop_users
set role_name = 'Mecánico',
    updated_at = now()
where role_name = 'MecÃ¡nico';

alter table inventory_items
  add column if not exists item_type text not null default 'repuesto';

update vehicles
set work_timer_started_at = coalesce(updated_at, now())
where estado = 'En Taller'
  and work_timer_started_at is null
  and (assigned_mechanic_id is not null or assigned_mechanic_name <> '');

alter table vehicles
  drop constraint if exists vehicles_company_patente_unique;

create index if not exists idx_vehicles_company_patente_fecha
  on vehicles(company_id, patente, fecha_ingreso desc);
create index if not exists idx_roles_company_id on roles(company_id);
create index if not exists idx_workshop_users_company_id on workshop_users(company_id);
create index if not exists idx_inventory_items_company_id on inventory_items(company_id);
create index if not exists idx_inventory_movements_company_date on inventory_movements(company_id, created_at desc);
create unique index if not exists idx_inventory_items_company_sku_unique
  on inventory_items(company_id, sku)
  where sku is not null and sku <> '';
create unique index if not exists idx_inventory_items_company_barcode_unique
  on inventory_items(company_id, barcode)
  where barcode is not null and barcode <> '';
create index if not exists idx_budget_quotes_company_id on budget_quotes(company_id);
create index if not exists idx_budget_quotes_company_status_date on budget_quotes(company_id, status, issue_date desc);
create index if not exists idx_audit_logs_company_created_at on audit_logs(company_id, created_at desc);
create index if not exists idx_parking_releases_company_vehicle on parking_releases(company_id, vehicle_id);
create index if not exists idx_service_categories_company on service_categories(company_id, active, name);
create index if not exists idx_service_catalog_company on service_catalog(company_id, active, name);
create index if not exists idx_vehicle_services_vehicle on vehicle_services(vehicle_id);
