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
  name text not null,
  rut text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

alter table inventory_items
  drop constraint if exists inventory_items_supplier_id_fkey;
alter table inventory_items
  add constraint inventory_items_supplier_id_fkey
  foreign key (supplier_id) references inventory_suppliers(id) on delete set null;

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null,
  quantity numeric(12,2) not null,
  stock_before numeric(12,2) not null,
  stock_after numeric(12,2) not null,
  reason text not null default '',
  vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_patente text not null default '',
  mechanic_name text not null default '',
  user_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists inventory_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  supplier_id uuid references inventory_suppliers(id) on delete set null,
  order_number text not null,
  status text not null default 'pendiente',
  order_date date not null default current_date,
  expected_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number)
);

create table if not exists inventory_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references inventory_purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  received_quantity numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0
);

create table if not exists inventory_stock_counts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'abierto',
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists inventory_stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references inventory_stock_counts(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  expected_quantity numeric(12,2) not null,
  counted_quantity numeric(12,2) not null,
  difference numeric(12,2) generated always as (counted_quantity - expected_quantity) stored
);

create index if not exists idx_inventory_movements_company_date
  on inventory_movements(company_id, created_at desc);
create index if not exists idx_inventory_purchase_orders_company
  on inventory_purchase_orders(company_id, order_date desc);
create index if not exists idx_inventory_stock_counts_company
  on inventory_stock_counts(company_id, created_at desc);
