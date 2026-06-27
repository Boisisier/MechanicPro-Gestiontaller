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
  status text not null default 'Pendiente'
    check (status in ('Pendiente', 'En proceso', 'Completado', 'Cancelado')),
  added_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, service_name_snapshot)
);

create index if not exists idx_service_categories_company
  on service_categories(company_id, active, name);
create index if not exists idx_service_catalog_company
  on service_catalog(company_id, active, name);
create index if not exists idx_service_catalog_category
  on service_catalog(category_id);
create index if not exists idx_vehicle_services_vehicle
  on vehicle_services(vehicle_id);

-- Conserva como historial los servicios que ya estaban guardados en texto.
insert into vehicle_services (
  company_id,
  vehicle_id,
  service_name_snapshot,
  unit_price_snapshot,
  added_by
)
select
  v.company_id,
  v.id,
  trim(regexp_replace(service_text, '\s*\(\$\s*[0-9.]+\)\s*$', '')),
  coalesce(
    nullif(
      regexp_replace(
        coalesce(substring(service_text from '\(\$\s*([0-9.]+)\)'), ''),
        '[^0-9]',
        '',
        'g'
      ),
      ''
    ),
    '0'
  )::numeric,
  'Migración'
from vehicles v
cross join lateral unnest(v.servicios) service_text
where service_text not like '[REPUESTO]%'
  and trim(service_text) <> ''
on conflict (vehicle_id, service_name_snapshot) do nothing;
