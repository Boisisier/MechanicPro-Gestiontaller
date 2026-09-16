-- Portal de clientes, Fase 2: modelo de soporte para la página pública /estado/<token>.
--
-- 1) Fotos de avance: se crea la tabla y sus policies ahora para que la página pública ya
--    pueda mostrarlas si existen, pero la carga de fotos desde el panel del taller queda para
--    una fase posterior (necesita un bucket de almacenamiento con sus propias credenciales, que
--    todavía no están definidas). Hasta entonces esta tabla queda vacía y esa sección de la
--    página pública se renderiza vacía sin romper nada.
create table if not exists vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  url text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicle_photos_vehicle on vehicle_photos(vehicle_id);

alter table vehicle_photos enable row level security;
alter table vehicle_photos force row level security;
drop policy if exists tenant_isolation on vehicle_photos;
create policy tenant_isolation on vehicle_photos
  using (company_id = current_setting('app.current_company_id', true)::uuid)
  with check (company_id = current_setting('app.current_company_id', true)::uuid);
drop policy if exists tenant_isolation_public_lookup on vehicle_photos;
create policy tenant_isolation_public_lookup on vehicle_photos
  for select using (current_setting('app.public_lookup', true) = 'on');

-- 2) Datos de contacto del taller: companies no tenía ninguno. Sin UI para editarlos todavía
--    (se completan a mano por ahora); la página pública los muestra solo si no están vacíos.
alter table companies
  add column if not exists contact_phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_address text not null default '';

-- 3) La página pública resuelve el presupuesto de una orden vía
--    budget_quotes.converted_vehicle_id = vehicles.id (ver 20260712000000_add_public_tokens.sql
--    para por qué no hay vínculo confiable con un presupuesto todavía no convertido). Sin
--    índice esa consulta —que corre en cada carga de una página sin autenticar— escaneaba toda
--    la tabla.
create index if not exists idx_budget_quotes_converted_vehicle_id
  on budget_quotes (converted_vehicle_id) where converted_vehicle_id is not null;
