-- Ajustes encontrados en la auto-revisión pedida de las Fases 1 y 3 (generación de tokens y
-- registro de aprobaciones). Ninguno alcanza a justificar su propia fase; se agrupan acá.

-- Fase 1: public_token_expiry_days no tenía techo. "Configurable" no debería permitir dejar,
-- sin querer, una expiración de facto indefinida para una orden puntual (ej. 999999 días). 10
-- años cubre cualquier caso legítimo y deja un límite explícito.
alter table vehicles drop constraint if exists vehicles_public_token_expiry_days_check;
alter table vehicles
  add constraint vehicles_public_token_expiry_days_check
  check (public_token_expiry_days > 0 and public_token_expiry_days <= 3650);

-- Fase 3: el trigger de guardia usaba errcode 23503 (foreign_key_violation), que no es lo que
-- pasó — no hay ninguna FK involucrada, es una regla de negocio. Se redefine con el código por
-- defecto (P0001, raise_exception genérico) para no confundir a quien lea el log de Postgres
-- buscando una FK que no existe. Misma lógica, solo cambia el errcode.
create or replace function guard_budget_quote_item_approval()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.approval_status = 'aprobado' then
      raise exception 'partida % ya aprobada por el cliente: no se puede eliminar', OLD.id;
    end if;
    return OLD;
  end if;

  if OLD.approval_status = 'aprobado' and NEW.approval_status = 'aprobado' then
    if NEW.name is distinct from OLD.name
       or NEW.item_type is distinct from OLD.item_type
       or NEW.quantity is distinct from OLD.quantity
       or NEW.unit_price is distinct from OLD.unit_price then
      raise exception 'partida % ya aprobada por el cliente: reiniciar la aprobación antes de modificarla', OLD.id;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;
