-- Portal de clientes, Fase 3: aprobación de partidas individuales del presupuesto.
--
-- budget_quote_items gana estado de aprobación por partida (antes solo existía el estado a
-- nivel de todo el presupuesto, budget_quotes.status, usado por el flujo viejo de
-- /public/budgets/:token/respond).
alter table budget_quote_items
  add column if not exists approval_status text not null default 'pendiente'
    check (approval_status in ('pendiente', 'aprobado', 'rechazado')),
  add column if not exists approval_decided_at timestamptz;

-- Registro de auditoría append-only de cada decisión sobre una partida: quién (cliente desde
-- la página pública, o un miembro del taller reiniciando una aprobación para poder editarla),
-- desde dónde (ip + user agent, solo tienen sentido para acciones del cliente) y cuándo.
-- on delete restrict en budget_quote_item_id: una partida con historial de aprobación no se
-- puede borrar aunque nunca haya llegado a estar "aprobada" (p. ej. fue rechazada) — evita que
-- un DELETE deje el registro de auditoría apuntando a una fila fantasma.
create table if not exists budget_quote_item_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  budget_quote_item_id uuid not null references budget_quote_items(id) on delete restrict,
  budget_quote_id uuid not null references budget_quotes(id) on delete cascade,
  action text not null check (action in ('aprobado', 'rechazado', 'reiniciado')),
  actor text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_item_approvals_item
  on budget_quote_item_approvals (budget_quote_item_id);
create index if not exists idx_budget_item_approvals_budget
  on budget_quote_item_approvals (budget_quote_id);

alter table budget_quote_item_approvals enable row level security;
alter table budget_quote_item_approvals force row level security;
drop policy if exists tenant_isolation on budget_quote_item_approvals;
create policy tenant_isolation on budget_quote_item_approvals
  using (company_id = current_setting('app.current_company_id', true)::uuid)
  with check (company_id = current_setting('app.current_company_id', true)::uuid);
-- No hace falta una policy de bypass público para el INSERT: withPublicLookup() ya fija
-- app.current_company_id a la empresa real de la orden después de resolver el token (ver
-- comentario en server/index.js), así que el INSERT normal desde /public/estado/:token pasa la
-- policy de arriba igual que ya lo hace el UPDATE de /public/budgets/:token/respond.

-- Guardrail a nivel de base de datos, independiente de cualquier bug de la app: una vez que el
-- cliente aprobó una partida, no se puede borrar ni cambiar su nombre/cantidad/precio/tipo sin
-- antes reiniciar su aprobación explícitamente (lo que a su vez queda registrado en
-- budget_quote_item_approvals con action='reiniciado'). Así "no se puede modificar sin dejar
-- rastro" no depende de que el código del servidor lo respete siempre — si algún endpoint
-- intentara un UPDATE o DELETE directo sobre una partida aprobada, la base lo rechaza.
create or replace function guard_budget_quote_item_approval()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.approval_status = 'aprobado' then
      raise exception 'partida % ya aprobada por el cliente: no se puede eliminar', OLD.id
        using errcode = '23503';
    end if;
    return OLD;
  end if;

  if OLD.approval_status = 'aprobado' and NEW.approval_status = 'aprobado' then
    if NEW.name is distinct from OLD.name
       or NEW.item_type is distinct from OLD.item_type
       or NEW.quantity is distinct from OLD.quantity
       or NEW.unit_price is distinct from OLD.unit_price then
      raise exception 'partida % ya aprobada por el cliente: reiniciar la aprobación antes de modificarla', OLD.id
        using errcode = '23503';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_budget_quote_item_approval on budget_quote_items;
create trigger trg_guard_budget_quote_item_approval
before update or delete on budget_quote_items
for each row execute function guard_budget_quote_item_approval();
