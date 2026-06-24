-- =========================================================
-- EXTENSIONES
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- TABLA: companies
-- =========================================================

create table if not exists companies (
id uuid primary key default gen_random_uuid(),
name text not null unique,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

-- =========================================================
-- TABLA: users
-- =========================================================

create table if not exists users (
id uuid primary key default gen_random_uuid(),
full_name text not null,
email text not null unique,
password_hash text not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

-- =========================================================
-- TABLA: company_members
-- =========================================================

create table if not exists company_members (
id uuid primary key default gen_random_uuid(),
company_id uuid not null references companies(id) on delete cascade,
user_id uuid not null references users(id) on delete cascade,
role text not null default 'admin',
created_at timestamptz not null default now(),
unique (company_id, user_id)
);

-- =========================================================
-- TABLA: roles
-- =========================================================

create table if not exists roles (
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id) on delete cascade,
name text not null,
modules text[] not null default '{}',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
unique (company_id, name)
);

-- =========================================================
-- TABLA: workshop_users
-- =========================================================

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

-- =========================================================
-- TABLA: vehicles
-- =========================================================

create table if not exists vehicles (
id uuid primary key default gen_random_uuid(),

company_id uuid not null
    references companies(id) on delete cascade,

customer_name text not null,
customer_rut text not null,
customer_phone text not null,
customer_address text not null,
customer_city text not null,
customer_email text default '',

assigned_mechanic_id uuid,
assigned_mechanic_name text default '',

customer_advance numeric(12,2) not null default 0
    check (customer_advance >= 0),

attention_priority text not null default 'Normal',

estimated_work_hours numeric(8,2) not null default 0
    check (estimated_work_hours >= 0),

promised_delivery_date date,

customer_authorized boolean not null default false,
customer_authorized_at timestamptz,

work_timer_started_at timestamptz,

work_elapsed_seconds bigint not null default 0
    check (work_elapsed_seconds >= 0),

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

-- =========================================================
-- CONSTRAINTS vehicles
-- =========================================================

alter table vehicles
drop constraint if exists vehicles_attention_priority_check;

alter table vehicles
add constraint vehicles_attention_priority_check
check (
attention_priority in (
'Baja',
'Normal',
'Alta',
'Urgente'
)
);

alter table vehicles
drop constraint if exists vehicles_estado_check;

alter table vehicles
add constraint vehicles_estado_check
check (
estado in (
'Ingresado',
'En Taller',
'Entregado'
)
);

-- =========================================================
-- TABLA: inventory_items
-- =========================================================

create table if not exists inventory_items (
id uuid primary key default gen_random_uuid(),


company_id uuid not null
    references companies(id) on delete cascade,

item_type text not null default 'repuesto',

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

-- =========================================================
-- TABLA: budget_quotes
-- =========================================================

create table if not exists budget_quotes (
id uuid primary key default gen_random_uuid(),


company_id uuid not null
    references companies(id) on delete cascade,

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

-- =========================================================
-- TABLA: budget_quote_items
-- =========================================================

create table if not exists budget_quote_items (
id uuid primary key default gen_random_uuid(),


budget_quote_id uuid not null
    references budget_quotes(id) on delete cascade,

name text not null,

price numeric(12,2) not null default 0,

created_at timestamptz not null default now()


);

-- =========================================================
-- TABLA: audit_logs
-- =========================================================

create table if not exists audit_logs (
id uuid primary key default gen_random_uuid(),


company_id uuid not null
    references companies(id) on delete cascade,

user_name text not null,

module text not null,

action text not null,

detail text default '',

created_at timestamptz not null default now()


);

-- =========================================================
-- TABLA: parking_releases
-- =========================================================

create table if not exists parking_releases (
id uuid primary key default gen_random_uuid(),


company_id uuid not null
    references companies(id) on delete cascade,

vehicle_id uuid not null
    references vehicles(id) on delete cascade,

released_by text default '',

detail text default '',

created_at timestamptz not null default now(),

unique (company_id, vehicle_id)


);

-- =========================================================
-- INDICES
-- =========================================================

create index if not exists idx_vehicles_company_patente_fecha
on vehicles(company_id, patente, fecha_ingreso desc);

create index if not exists idx_roles_company_id
on roles(company_id);

create index if not exists idx_workshop_users_company_id
on workshop_users(company_id);

create index if not exists idx_inventory_items_company_id
on inventory_items(company_id);

create unique index if not exists idx_inventory_items_company_sku_unique
on inventory_items(company_id, sku)
where sku is not null and sku <> '';

create unique index if not exists idx_inventory_items_company_barcode_unique
on inventory_items(company_id, barcode)
where barcode is not null and barcode <> '';

create index if not exists idx_budget_quotes_company_id
on budget_quotes(company_id);

create index if not exists idx_audit_logs_company_created_at
on audit_logs(company_id, created_at desc);

create index if not exists idx_parking_releases_company_vehicle
on parking_releases(company_id, vehicle_id);

-- =========================================================
-- DESACTIVAR RLS (RECOMENDADO PARA TU BACKEND ACTUAL)
-- =========================================================

alter table companies disable row level security;
alter table users disable row level security;
alter table company_members disable row level security;
alter table roles disable row level security;
alter table workshop_users disable row level security;
alter table vehicles disable row level security;
alter table inventory_items disable row level security;
alter table budget_quotes disable row level security;
alter table budget_quote_items disable row level security;
alter table audit_logs disable row level security;
alter table parking_releases disable row level security;
