-- Portal de clientes, Fase 1: expiración configurable para el public_token de vehicles.
--
-- El token en sí ya existía desde 20260712000000_add_public_tokens.sql: una columna
-- `public_token uuid not null default gen_random_uuid()` con índice único. Eso ya cumple los
-- requisitos de la Fase 1 sin cambios: gen_random_uuid() usa el generador de números aleatorios
-- criptográficamente seguro de Postgres (pgcrypto/OpenSSL, no un PRNG determinístico), un UUID
-- son 122 bits de entropía real (>= 32 caracteres como texto), se genera solo al insertar la
-- fila (una fila de `vehicles` = una orden de trabajo) y no depende de patente, RUT ni del id
-- de la orden. Por eso esta migración NO toca esa columna ni regenera tokens existentes.
--
-- Lo que faltaba, y es lo que agrega este archivo, es expiración. Requisito: "por defecto 60
-- días después de la entrega", configurable. La entrega se marca en el momento en que
-- `fecha_salida_confirmada` pasa a tener valor (ver src/shared components de vehículos), así
-- que la expiración real se calcula recién ahí. Antes de la entrega el link tiene que seguir
-- funcionando (el cliente necesita ver el estado mientras el auto sigue en el taller), así que
-- se usa un techo generoso de 1 año desde el ingreso en vez de dejarlo sin expiración — evita
-- que una orden que nunca se marca como entregada deje un token con acceso indefinido.

alter table vehicles
  add column if not exists public_token_expiry_days integer not null default 60
    check (public_token_expiry_days > 0),
  add column if not exists public_token_expires_at timestamptz;

update vehicles
set public_token_expires_at = coalesce(
  fecha_salida_confirmada + (public_token_expiry_days || ' days')::interval,
  fecha_ingreso + interval '1 year'
)
where public_token_expires_at is null;

alter table vehicles alter column public_token_expires_at set not null;

create or replace function set_vehicle_public_token_expiry()
returns trigger as $$
begin
  if new.fecha_salida_confirmada is not null then
    new.public_token_expires_at :=
      new.fecha_salida_confirmada + (new.public_token_expiry_days || ' days')::interval;
  elsif new.public_token_expires_at is null then
    new.public_token_expires_at := new.fecha_ingreso + interval '1 year';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vehicle_public_token_expiry on vehicles;
create trigger trg_vehicle_public_token_expiry
before insert or update of fecha_salida_confirmada, public_token_expiry_days on vehicles
for each row execute function set_vehicle_public_token_expiry();

-- Usado por el lookup público (Fase 2) para rechazar tokens vencidos sin escanear toda la tabla.
create index if not exists idx_vehicles_public_token_expires_at
  on vehicles (public_token_expires_at);
