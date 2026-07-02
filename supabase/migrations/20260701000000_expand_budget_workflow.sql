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

alter table budget_quotes drop constraint if exists budget_quotes_status_check;
alter table budget_quotes
  add constraint budget_quotes_status_check
  check (status in ('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'convertido', 'anulado'));

alter table budget_quotes drop constraint if exists budget_quotes_discount_check;
alter table budget_quotes
  add constraint budget_quotes_discount_check check (discount_percent between 0 and 100);

alter table budget_quotes drop constraint if exists budget_quotes_tax_check;
alter table budget_quotes
  add constraint budget_quotes_tax_check check (tax_percent between 0 and 100);

alter table budget_quote_items drop constraint if exists budget_quote_items_type_check;
alter table budget_quote_items
  add constraint budget_quote_items_type_check
  check (item_type in ('servicio', 'repuesto', 'insumo'));

create index if not exists idx_budget_quotes_company_status_date
  on budget_quotes(company_id, status, issue_date desc);
