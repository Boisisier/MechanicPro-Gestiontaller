-- Estado de suscripción por empresa.
--
-- Hasta ahora `companies` no tenía ninguna noción de plan ni de si el taller está al día: no
-- existía forma de cortarle el servicio a quien deja de pagar, aunque la landing ya publica
-- planes con precio. Esto agrega el estado mínimo para poder hacerlo, sin acoplarse todavía a
-- ningún proveedor de pagos (esa decisión está pendiente de abrir la cuenta corriente de la
-- empresa): cuando se conecte uno, su webhook solo tiene que escribir `subscription_status`.
--
-- Los nombres de plan son los mismos de la landing (landing/index.html), en slug.
alter table companies
  add column if not exists plan text not null default 'taller',
  add column if not exists subscription_status text not null default 'activa',
  -- Cuándo pasó a 'suspendida'. Se deja nulo al reactivar, así que vale como "desde cuándo
  -- está cortada" y no como historial — el historial, si hace falta, va en audit_logs.
  add column if not exists subscription_suspended_at timestamptz;

alter table companies drop constraint if exists companies_plan_check;
alter table companies
  add constraint companies_plan_check
  check (plan in ('taller', 'taller_pro', 'cadena'));

-- 'cancelada' es distinto de 'suspendida': suspendida es transitoria (dejó de pagar, puede
-- volver), cancelada es definitiva (se fue). Las dos bloquean la escritura por igual; la
-- distinción existe para no tener que adivinar después por qué está cortada una cuenta.
alter table companies drop constraint if exists companies_subscription_status_check;
alter table companies
  add constraint companies_subscription_status_check
  check (subscription_status in ('activa', 'suspendida', 'cancelada'));

-- El default 'activa' aplica a las empresas que ya existen: nadie queda cortado por correr
-- esta migración. Explícito igualmente, por si alguna fila quedó con el default viejo.
update companies set subscription_status = 'activa' where subscription_status is null;
