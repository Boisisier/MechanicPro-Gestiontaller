import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { completeServiceCatalog } from './serviceCatalogSeed.js';
import { loadConfig } from './config.js';
import {
  createRateLimiter,
  requestContext,
  securityHeaders,
} from './security.js';
import {
  calculateBudgetTotal,
  normalizePatente,
  splitServicePrice,
} from './lib/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const config = loadConfig();
const app = express();
const port = config.port;
const jwtSecret = config.jwtSecret;
let applicationReady = false;
let server;

const demoCompanyName = process.env.DEMO_COMPANY_NAME || 'Demo Taller';
const demoUserName = process.env.DEMO_USER_NAME || 'Demo Cliente';
const demoUserEmail = process.env.DEMO_USER_EMAIL || 'demo@local';
const demoUserPassword = process.env.DEMO_USER_PASSWORD || 'demo1234';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl
    ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('cors_origin_denied'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));
app.use(express.json({ limit: config.bodyLimit }));
app.use(createRateLimiter({ windowMs: 60_000, max: 300 }));
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) =>
    `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
});

const allowedStatuses = new Set(['Ingresado', 'En Taller', 'Entregado']);
const allowedTipos = new Set(['Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon']);
const patenteRegex = /^(?:[A-Z]{2}-\d{4}|[A-Z]{4}-\d{2})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const customerNameMaxLength = 100;
const defaultRoles = [
  {
    name: 'Administrador de Taller',
    modules: ['Dashboard', 'Vehículos', 'Presupuesto', 'Inventario', 'Estacionamiento', 'Reportes', 'Configuración', 'Registro de acciones'],
  },
  {
    name: 'Administrativo',
    modules: ['Dashboard', 'Vehículos', 'Presupuesto', 'Estacionamiento', 'Reportes'],
  },
  {
    name: 'Mecánico',
    modules: ['Vehículos', 'Reportes'],
  },
];

const allowedAttentionPriorities = new Set(['Baja', 'Normal', 'Alta', 'Urgente']);

const normalizeAttentionPriority = (value) =>
  allowedAttentionPriorities.has(value) ? value : 'Normal';

const normalizeEstimatedWorkHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const ensureVehicleColumns = async () => {
  await pool.query('create extension if not exists "pgcrypto"');
  await pool.query(`
    create table if not exists companies (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists company_members (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role text not null default 'admin',
      created_at timestamptz not null default now(),
      unique (company_id, user_id)
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
    create table if not exists roles (
      id uuid primary key default gen_random_uuid(),
      company_id uuid references companies(id) on delete cascade,
      name text not null,
      modules text[] not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (company_id, name)
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
    create table if not exists budget_quote_items (
      id uuid primary key default gen_random_uuid(),
      budget_quote_id uuid not null references budget_quotes(id) on delete cascade,
      name text not null,
      price numeric(12,2) not null default 0,
      created_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      user_name text not null,
      module text not null,
      action text not null,
      detail text default '',
      created_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists parking_releases (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      vehicle_id uuid not null references vehicles(id) on delete cascade,
      released_by text default '',
      detail text default '',
      created_at timestamptz not null default now(),
      unique (company_id, vehicle_id)
    )
  `);
  await pool.query(`
    alter table inventory_items
      add column if not exists sale_price numeric(12,2) not null default 0,
      add column if not exists status text not null default 'activo',
      add column if not exists supplier_id uuid,
      add column if not exists warehouse text not null default '',
      add column if not exists aisle text not null default '',
      add column if not exists shelf text not null default '',
      add column if not exists bin text not null default ''
  `);
  await pool.query(`
    create table if not exists inventory_suppliers (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      name text not null, rut text not null default '', phone text not null default '',
      email text not null default '', address text not null default '',
      active boolean not null default true,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      unique (company_id, name)
    )
  `);
  await pool.query(`
    create table if not exists inventory_movements (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      inventory_item_id uuid not null references inventory_items(id) on delete cascade,
      movement_type text not null, quantity numeric(12,2) not null,
      stock_before numeric(12,2) not null, stock_after numeric(12,2) not null,
      reason text not null default '', vehicle_id uuid references vehicles(id) on delete set null,
      vehicle_patente text not null default '', mechanic_name text not null default '',
      user_name text not null default '', created_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists inventory_purchase_orders (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      supplier_id uuid references inventory_suppliers(id) on delete set null,
      order_number text not null, status text not null default 'pendiente',
      order_date date not null default current_date, expected_date date,
      notes text not null default '', created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(), unique (company_id, order_number)
    )
  `);
  await pool.query(`
    create table if not exists inventory_purchase_order_items (
      id uuid primary key default gen_random_uuid(),
      purchase_order_id uuid not null references inventory_purchase_orders(id) on delete cascade,
      inventory_item_id uuid not null references inventory_items(id) on delete restrict,
      quantity numeric(12,2) not null, received_quantity numeric(12,2) not null default 0,
      unit_cost numeric(12,2) not null default 0
    )
  `);
  await pool.query(`
    create table if not exists inventory_stock_counts (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      status text not null default 'abierto', notes text not null default '',
      created_by text not null default '', created_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `);
  await pool.query(`
    create table if not exists inventory_stock_count_items (
      id uuid primary key default gen_random_uuid(),
      stock_count_id uuid not null references inventory_stock_counts(id) on delete cascade,
      inventory_item_id uuid not null references inventory_items(id) on delete cascade,
      expected_quantity numeric(12,2) not null, counted_quantity numeric(12,2) not null
    )
  `);
  await pool.query(`
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
      add column if not exists converted_vehicle_id uuid references vehicles(id) on delete set null
  `);
  await pool.query(`
    alter table budget_quote_items
      add column if not exists item_type text not null default 'servicio',
      add column if not exists reference_id uuid,
      add column if not exists quantity numeric(10,2) not null default 1,
      add column if not exists unit_price numeric(12,2) not null default 0,
      add column if not exists estimated_hours numeric(8,2) not null default 0
  `);
  await pool.query(`
    update budget_quote_items
    set unit_price = price
    where unit_price = 0 and price > 0
  `);
  await pool.query(`
    create table if not exists service_categories (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      name text not null,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (company_id, name)
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
      add column if not exists en_estacionamiento_manual boolean not null default false
  `);
  await pool.query('alter table vehicles drop column if exists fallas_detectadas');
  await pool.query('alter table vehicles drop constraint if exists vehicles_attention_priority_check');
  await pool.query('alter table vehicles drop constraint if exists vehicles_estimated_work_hours_nonnegative');
  await pool.query(`
    alter table vehicles
      add constraint vehicles_attention_priority_check
        check (attention_priority in ('Baja', 'Normal', 'Alta', 'Urgente')),
      add constraint vehicles_estimated_work_hours_nonnegative
        check (estimated_work_hours >= 0)
  `);
  await pool.query('alter table vehicles drop constraint if exists vehicles_estado_check');
  await pool.query('alter table vehicles drop constraint if exists vehicles_estado_chk');
  await pool.query("update vehicles set estado = 'Ingresado' where estado = 'En taller'");
  await pool.query("update vehicles set estado = 'En Taller' where estado = 'En revision'");
  await pool.query('alter table vehicles alter column estado set default \'Ingresado\'');
  await pool.query(`
    alter table vehicles
      add constraint vehicles_estado_check
      check (estado in ('Ingresado', 'En Taller', 'Entregado'))
  `);
  await pool.query(`
    alter table workshop_users
      add column if not exists rut text not null default '',
      add column if not exists password_hash text not null default ''
  `);
  await pool.query(`
    update roles
    set name = 'Mecánico',
        modules = array_replace(array_replace(modules, 'VehÃ­culos', 'Vehículos'), 'ConfiguraciÃ³n', 'Configuración'),
        updated_at = now()
    where name = 'MecÃ¡nico'
       or 'VehÃ­culos' = any(modules)
       or 'ConfiguraciÃ³n' = any(modules)
  `);
  await pool.query(`
    update workshop_users
    set role_name = 'Mecánico',
        updated_at = now()
    where role_name = 'MecÃ¡nico'
  `);
  await pool.query(`
    alter table inventory_items
      add column if not exists item_type text not null default 'repuesto'
  `);
  await pool.query(`
    update vehicles
    set work_timer_started_at = coalesce(updated_at, now())
    where estado = 'En Taller'
      and work_timer_started_at is null
      and (assigned_mechanic_id is not null or assigned_mechanic_name <> '')
  `);
  await pool.query(`
    alter table vehicles
      drop constraint if exists vehicles_company_patente_unique
  `);
  await pool.query(`
    create index if not exists idx_vehicles_company_patente_fecha
      on vehicles(company_id, patente, fecha_ingreso desc)
  `);
  await pool.query('create index if not exists idx_roles_company_id on roles(company_id)');
  await pool.query('create index if not exists idx_workshop_users_company_id on workshop_users(company_id)');
  await pool.query('create index if not exists idx_inventory_items_company_id on inventory_items(company_id)');
  await pool.query('create index if not exists idx_inventory_movements_company_date on inventory_movements(company_id, created_at desc)');
  await pool.query(`
    create unique index if not exists idx_inventory_items_company_sku_unique
      on inventory_items(company_id, sku)
      where sku is not null and sku <> ''
  `);
  await pool.query(`
    create unique index if not exists idx_inventory_items_company_barcode_unique
      on inventory_items(company_id, barcode)
      where barcode is not null and barcode <> ''
  `);
  await pool.query('create index if not exists idx_budget_quotes_company_id on budget_quotes(company_id)');
  await pool.query('create index if not exists idx_budget_quotes_company_status_date on budget_quotes(company_id, status, issue_date desc)');
  await pool.query('create index if not exists idx_audit_logs_company_created_at on audit_logs(company_id, created_at desc)');
  await pool.query('create index if not exists idx_parking_releases_company_vehicle on parking_releases(company_id, vehicle_id)');
  await pool.query('create index if not exists idx_service_categories_company on service_categories(company_id, active, name)');
  await pool.query('create index if not exists idx_service_catalog_company on service_catalog(company_id, active, name)');
  await pool.query('create index if not exists idx_vehicle_services_vehicle on vehicle_services(vehicle_id)');
};

const normalizeUuid = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim();
  return uuidRegex.test(normalized) ? normalized : null;
};

const seedDefaultRoles = async (client, companyId) => {
  for (const role of defaultRoles) {
    await client.query(
      `insert into roles (company_id, name, modules)
       values ($1, $2, $3)
       on conflict (company_id, name) do update set modules = excluded.modules, updated_at = now()`,
      [companyId, role.name, role.modules]
    );
  }
};

const seedDefaultServices = async (client, companyId) => {
  const existingResult = await client.query(
    'select name from service_catalog where company_id = $1',
    [companyId],
  );
  const existingNames = new Set(existingResult.rows.map((row) => row.name));
  const missingServices = completeServiceCatalog.filter(
    ([, , name]) => !existingNames.has(name),
  );
  if (missingServices.length === 0) {
    return;
  }

  for (const [code, categoryName, name, price, hours] of missingServices) {
    const categoryResult = await client.query(
      `insert into service_categories (company_id, name)
       values ($1, $2)
       on conflict (company_id, name) do update set updated_at = now()
       returning id`,
      [companyId, categoryName],
    );
    await client.query(
      `insert into service_catalog
        (company_id, category_id, code, name, base_price, estimated_hours)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (company_id, name) do update
       set category_id = excluded.category_id,
           base_price = case
             when service_catalog.base_price = 0 then excluded.base_price
             else service_catalog.base_price
           end,
           estimated_hours = case
             when service_catalog.estimated_hours = 0 then excluded.estimated_hours
             else service_catalog.estimated_hours
           end,
           active = true,
           updated_at = now()`,
      [companyId, categoryResult.rows[0].id, code, name, price, hours],
    );
  }
};

const validateVehicle = (payload) => {
  const requiredFields = ['patente', 'marca', 'modelo', 'ano', 'estado'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return `Missing field: ${field}`;
    }
  }
  if (payload.tipo_vehiculo && !allowedTipos.has(payload.tipo_vehiculo)) {
    return 'Invalid tipo_vehiculo';
  }
  if (!payload.customer_name || !payload.customer_rut || !payload.customer_phone || !payload.customer_address || !payload.customer_city) {
    return 'Missing customer fields';
  }
  if (String(payload.customer_name).trim().length > customerNameMaxLength) {
    return 'Customer name too long';
  }
  if (!patenteRegex.test(payload.patente)) {
    return 'Invalid patente';
  }
  if (!allowedStatuses.has(payload.estado)) {
    return 'Invalid estado';
  }
  return null;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash) {
    return false;
  }
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  if (hash.length !== derived.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
};

const ensureJwtSecret = (res) => {
  if (!jwtSecret) {
    res.status(500).json({ error: 'jwt_not_configured' });
    return false;
  }
  return true;
};

const getTokenPayload = (req, res) => {
  if (!ensureJwtSecret(res)) {
    return null;
  }
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return null;
  }
  const token = header.slice(7);
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
};

const authRequired = (req, res, next) => {
  const payload = getTokenPayload(req, res);
  if (!payload) {
    return;
  }
  if (!payload.company_id) {
    return res.status(403).json({ error: 'missing_company' });
  }
  req.user = payload;
  return next();
};

const ensureWritable = (req, res, next) => next();

const isMechanicRole = (role = '') => role === 'Mecánico';
const isWorkshopAdminRole = (role = '') =>
  role === 'admin' || role === 'Administrador de Taller';

const denyMechanicAccess = (req, res, next) => {
  if (isMechanicRole(req.user?.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
};

const requireWorkshopAdmin = (req, res, next) => {
  if (!isWorkshopAdminRole(req.user?.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
};

const syncVehicleServices = async (
  client,
  companyId,
  vehicleId,
  services = [],
  addedBy = '',
  vehicleStatus = 'Ingresado',
) => {
  const parsedServices = services
    .map(String)
    .filter((service) => !service.startsWith('[REPUESTO]'))
    .map(splitServicePrice)
    .filter((service) => service.name);

  const names = parsedServices.map((service) => service.name);
  if (names.length === 0) {
    await client.query(
      'delete from vehicle_services where vehicle_id = $1 and company_id = $2',
      [vehicleId, companyId],
    );
    return;
  }

  const catalogResult = await client.query(
    `select id, name, base_price::float as base_price,
            estimated_hours::float as estimated_hours
     from service_catalog
     where company_id = $1 and name = any($2::text[])`,
    [companyId, names],
  );
  const catalogByName = new Map(
    catalogResult.rows.map((service) => [service.name, service]),
  );

  for (const service of parsedServices) {
    const catalogItem = catalogByName.get(service.name);
    const snapshotPrice = service.price
      ? Number(service.price)
      : Number(catalogItem?.base_price) || 0;
    await client.query(
      `insert into vehicle_services
        (company_id, vehicle_id, service_id, service_name_snapshot,
         unit_price_snapshot, estimated_hours_snapshot, added_by, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (vehicle_id, service_name_snapshot)
       do update set service_id = coalesce(vehicle_services.service_id, excluded.service_id),
                     unit_price_snapshot = case
                       when vehicle_services.status = 'Completado'
                         then vehicle_services.unit_price_snapshot
                       else excluded.unit_price_snapshot
                     end,
                     estimated_hours_snapshot = case
                       when vehicle_services.status = 'Completado'
                         then vehicle_services.estimated_hours_snapshot
                       else excluded.estimated_hours_snapshot
                     end,
                     status = excluded.status,
                     updated_at = now()`,
      [
        companyId,
        vehicleId,
        catalogItem?.id || null,
        service.name,
        snapshotPrice,
        Number(catalogItem?.estimated_hours) || 0,
        addedBy,
        vehicleStatus === 'Entregado'
          ? 'Completado'
          : vehicleStatus === 'En Taller'
            ? 'En proceso'
            : 'Pendiente',
      ],
    );
  }
  await client.query(
    `delete from vehicle_services
     where vehicle_id = $1 and company_id = $2
       and not (service_name_snapshot = any($3::text[]))`,
    [vehicleId, companyId, names],
  );
};

const sanitizeServicesForMechanic = (services = []) =>
  services.map((service) => {
    if (String(service).startsWith('[REPUESTO]')) {
      const parts = String(service).replace('[REPUESTO]', '').trim().split('|');
      while (parts.length < 8) {
        parts.push('');
      }
      parts[5] = '0';
      return `[REPUESTO] ${parts.join('|')}`;
    }
    return splitServicePrice(service).name;
  });

const mergeMechanicServicesWithStoredPrices = (storedServices = [], incomingServices = []) => {
  const servicePrices = new Map();
  const partPrices = new Map();
  const storedServiceTexts = new Map();

  storedServices.forEach((service) => {
    const text = String(service);
    if (text.startsWith('[REPUESTO]')) {
      const parts = text.replace('[REPUESTO]', '').trim().split('|');
      if (parts[0]) {
        partPrices.set(parts[0], parts[5] || '0');
      }
      return;
    }
    const parsed = splitServicePrice(text);
    if (parsed.name) {
      storedServiceTexts.set(parsed.name, text);
    }
    if (parsed.name && parsed.price) {
      servicePrices.set(parsed.name, parsed.price);
    }
  });

  const incomingServiceNames = new Set();
  const mergedServices = incomingServices.map((service) => {
    const text = String(service);
    if (text.startsWith('[REPUESTO]')) {
      const parts = text.replace('[REPUESTO]', '').trim().split('|');
      while (parts.length < 8) {
        parts.push('');
      }
      parts[5] = partPrices.get(parts[0]) || '0';
      return `[REPUESTO] ${parts.join('|')}`;
    }
    const parsed = splitServicePrice(text);
    if (parsed.name) {
      incomingServiceNames.add(parsed.name);
    }
    const price = servicePrices.get(parsed.name);
    return price ? `${parsed.name} ($${price})` : parsed.name;
  });

  storedServiceTexts.forEach((storedText, serviceName) => {
    if (!incomingServiceNames.has(serviceName)) {
      mergedServices.push(storedText);
    }
  });

  return mergedServices;
};

const applyCatalogPricesToMissingServices = async (companyId, services = []) => {
  const parsed = services
    .map(String)
    .filter((service) => !service.startsWith('[REPUESTO]'))
    .map(splitServicePrice);
  const missingNames = parsed
    .filter((service) => !service.price)
    .map((service) => service.name);
  if (missingNames.length === 0) {
    return services;
  }
  const { rows } = await pool.query(
    `select name, base_price::float as base_price
     from service_catalog
     where company_id = $1 and active = true and name = any($2::text[])`,
    [companyId, missingNames],
  );
  const prices = new Map(rows.map((service) => [service.name, service.base_price]));
  return services.map((service) => {
    const text = String(service);
    if (text.startsWith('[REPUESTO]')) {
      return text;
    }
    const parsedService = splitServicePrice(text);
    if (parsedService.price || !prices.has(parsedService.name)) {
      return text;
    }
    return `${parsedService.name} ($${prices.get(parsedService.name)})`;
  });
};

const sanitizeVehicleForRole = (vehicle, role) => {
  if (!isMechanicRole(role)) {
    return vehicle;
  }
  return {
    ...vehicle,
    servicios: sanitizeServicesForMechanic(vehicle.servicios || []),
    customer_advance: 0,
  };
};

app.get('/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'ok', uptime_seconds: Math.floor(process.uptime()) });
});

app.get('/health/ready', async (req, res) => {
  if (!applicationReady) {
    return res.status(503).json({ status: 'starting' });
  }
  try {
    await pool.query('select 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.post('/auth/demo-login', authRateLimiter, async (req, res) => {
  if (!ensureJwtSecret(res)) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');

    let companyResult = await client.query('select id, name from companies where name = $1 limit 1', [
      demoCompanyName,
    ]);
    if (companyResult.rows.length === 0) {
      companyResult = await client.query(
        'insert into companies (name) values ($1) returning id, name',
        [demoCompanyName]
      );
    }
    const company = companyResult.rows[0];
    await seedDefaultRoles(client, company.id);

    let userResult = await client.query(
      'select id, full_name, email, password_hash from users where email = $1 limit 1',
      [demoUserEmail]
    );
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'insert into users (full_name, email, password_hash) values ($1, $2, $3) returning id, full_name, email, password_hash',
        [demoUserName, demoUserEmail, hashPassword(demoUserPassword)]
      );
    } else if (!verifyPassword(demoUserPassword, userResult.rows[0].password_hash)) {
      userResult = await client.query(
        'update users set full_name = $1, password_hash = $2 where email = $3 returning id, full_name, email, password_hash',
        [demoUserName, hashPassword(demoUserPassword), demoUserEmail]
      );
    }
    const user = userResult.rows[0];

    const membershipResult = await client.query(
      'select id from company_members where company_id = $1 and user_id = $2 limit 1',
      [company.id, user.id]
    );
    if (membershipResult.rows.length === 0) {
      await client.query(
        'insert into company_members (company_id, user_id, role) values ($1, $2, $3)',
        [company.id, user.id, 'admin']
      );
    } else {
      await client.query('update company_members set role = $3 where company_id = $1 and user_id = $2', [
        company.id,
        user.id,
        'admin',
      ]);
    }

    await client.query('commit');

    const token = jwt.sign(
      { user_id: user.id, company_id: company.id, role: 'admin' },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email },
      company: { id: company.id, name: company.name },
      role: 'admin',
      demo: true,
    });
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    console.error('POST /auth/demo-login failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.post('/auth/login', authRateLimiter, async (req, res) => {
  if (!ensureJwtSecret(res)) {
    return;
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  const client = await pool.connect();
  try {
    await client.query('begin');

    if (email === demoUserEmail.toLowerCase() && password === demoUserPassword) {
      let companyResult = await client.query('select id, name from companies where name = $1 limit 1', [
        demoCompanyName,
      ]);
      if (companyResult.rows.length === 0) {
        companyResult = await client.query(
          'insert into companies (name) values ($1) returning id, name',
          [demoCompanyName]
        );
      }
      const company = companyResult.rows[0];
      await seedDefaultRoles(client, company.id);

      let userResult = await client.query(
        'select id, full_name, email, password_hash from users where email = $1 limit 1',
        [email]
      );
      if (userResult.rows.length === 0) {
        userResult = await client.query(
          'insert into users (full_name, email, password_hash) values ($1, $2, $3) returning id, full_name, email, password_hash',
          [demoUserName, email, hashPassword(password)]
        );
      } else if (!verifyPassword(password, userResult.rows[0].password_hash)) {
        userResult = await client.query(
          'update users set full_name = $1, password_hash = $2 where email = $3 returning id, full_name, email, password_hash',
          [demoUserName, hashPassword(password), email]
        );
      }
      const user = userResult.rows[0];

      const membershipResult = await client.query(
        'select id from company_members where company_id = $1 and user_id = $2 limit 1',
        [company.id, user.id]
      );
      if (membershipResult.rows.length === 0) {
        await client.query(
          'insert into company_members (company_id, user_id, role) values ($1, $2, $3)',
          [company.id, user.id, 'admin']
        );
      }

      await client.query('commit');

      const token = jwt.sign(
        { user_id: user.id, company_id: company.id, role: 'admin' },
        jwtSecret,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email },
        company: { id: company.id, name: company.name },
        role: 'admin',
      });
    }

    const { rows } = await client.query(
      `select u.id, u.full_name, u.email, u.password_hash, c.id as company_id, c.name as company_name, cm.role
       from users u
       join company_members cm on cm.user_id = u.id
       join companies c on c.id = cm.company_id
       where lower(u.email) = $1
       order by cm.created_at asc
       limit 1`,
      [email]
    );

    if (rows.length > 0 && verifyPassword(password, rows[0].password_hash)) {
      await client.query('commit');

      const user = rows[0];
      const token = jwt.sign(
        { user_id: user.id, company_id: user.company_id, role: user.role, source: 'user' },
        jwtSecret,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email },
        company: { id: user.company_id, name: user.company_name },
        role: user.role,
      });
    }

    const workshopUserResult = await client.query(
      `select wu.id, wu.name, wu.email, wu.password_hash, wu.role_name, c.id as company_id, c.name as company_name
       from workshop_users wu
       join companies c on c.id = wu.company_id
       where lower(wu.email) = $1 and wu.active = true
       limit 1`,
      [email]
    );

    if (
      workshopUserResult.rows.length === 0 ||
      !verifyPassword(password, workshopUserResult.rows[0].password_hash)
    ) {
      await client.query('rollback');
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    await client.query('commit');

    const workshopUser = workshopUserResult.rows[0];
    const token = jwt.sign(
      {
        user_id: workshopUser.id,
        company_id: workshopUser.company_id,
        role: workshopUser.role_name,
        source: 'workshop_user',
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id: workshopUser.id,
        full_name: workshopUser.name,
        email: workshopUser.email,
      },
      company: {
        id: workshopUser.company_id,
        name: workshopUser.company_name,
      },
      role: workshopUser.role_name,
    });
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    console.error('POST /auth/login failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.get('/auth/me', (req, res) => {
  const payload = getTokenPayload(req, res);
  if (!payload) {
    return;
  }

  const { user_id, company_id } = payload;
  if (payload.source === 'workshop_user') {
    pool
      .query(
        `select wu.id, wu.name, wu.email, wu.role_name, c.id as company_id, c.name as company_name
         from workshop_users wu
         join companies c on c.id = wu.company_id
         where wu.id = $1 and wu.company_id = $2 and wu.active = true`,
        [user_id, company_id]
      )
      .then(({ rows }) => {
        if (rows.length === 0) {
          return res.status(404).json({ error: 'not_found' });
        }
        const row = rows[0];
        return res.json({
          user: { id: row.id, full_name: row.name, email: row.email },
          company: { id: row.company_id, name: row.company_name },
          role: row.role_name,
        });
      })
      .catch((error) => {
        console.error('GET /auth/me workshop_user failed', error);
        res.status(500).json({ error: 'internal_error' });
      });
    return;
  }

  pool
    .query(
      `select u.id, u.full_name, u.email, c.id as company_id, c.name as company_name, cm.role
       from users u
       join company_members cm on cm.user_id = u.id
       join companies c on c.id = cm.company_id
       where u.id = $1 and cm.company_id = $2`,
      [user_id, company_id]
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: 'not_found' });
      }
      const row = rows[0];
      res.json({
        user: { id: row.id, full_name: row.full_name, email: row.email },
        company: { id: row.company_id, name: row.company_name },
        role: row.role,
      });
    })
    .catch((error) => {
      console.error('GET /auth/me failed', error);
      res.status(500).json({ error: 'internal_error' });
    });
});

app.get('/roles', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      'select id, name, modules, created_at, updated_at from roles where company_id = $1 order by name',
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /roles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/service-categories', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    await seedDefaultServices(pool, companyId);
    const { rows } = await pool.query(
      `select id, name, active, created_at, updated_at
       from service_categories
       where company_id = $1
       order by active desc, name`,
      [companyId],
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /service-categories failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/service-categories', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const { rows } = await pool.query(
      `insert into service_categories (company_id, name)
       values ($1, $2)
       returning id, name, active, created_at, updated_at`,
      [companyId, name],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'service_category_exists' });
    }
    console.error('POST /service-categories failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/service-categories/:id', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const { rows } = await pool.query(
      `update service_categories
       set name = $1, active = $2, updated_at = now()
       where id = $3 and company_id = $4
       returning id, name, active, created_at, updated_at`,
      [name, req.body.active !== false, req.params.id, companyId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'service_category_exists' });
    }
    console.error('PUT /service-categories/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/service-catalog', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  const includeInactive =
    req.query.include_inactive === 'true' && isWorkshopAdminRole(req.user.role);
  try {
    await seedDefaultServices(pool, companyId);
    const { rows } = await pool.query(
      `select sc.id, sc.category_id, c.name as category, sc.code, sc.name,
              sc.description, sc.base_price::float as base_price,
              sc.estimated_hours::float as estimated_hours, sc.active,
              sc.created_at, sc.updated_at
       from service_catalog sc
       join service_categories c on c.id = sc.category_id
       where sc.company_id = $1
         and ($2::boolean or (sc.active = true and c.active = true))
       order by c.name, sc.name`,
      [companyId, includeInactive],
    );
    res.json(
      isMechanicRole(req.user.role)
        ? rows.map(({ base_price, ...service }) => service)
        : rows,
    );
  } catch (error) {
    console.error('GET /service-catalog failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/service-catalog', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const code = String(req.body.code || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  const categoryId = normalizeUuid(req.body.category_id);
  const basePrice = Number(req.body.base_price);
  const estimatedHours = Number(req.body.estimated_hours);
  if (!code || !name || !categoryId || !Number.isFinite(basePrice) || basePrice < 0 ||
      !Number.isFinite(estimatedHours) || estimatedHours < 0) {
    return res.status(400).json({ error: 'invalid_service' });
  }
  try {
    const { rows } = await pool.query(
      `insert into service_catalog
        (company_id, category_id, code, name, description, base_price, estimated_hours)
       select $1, c.id, $2, $3, $4, $5, $6
       from service_categories c
       where c.id = $7 and c.company_id = $1
       returning id, category_id, code, name, description,
                 base_price::float as base_price, estimated_hours::float as estimated_hours,
                 active, created_at, updated_at`,
      [companyId, code, name, req.body.description || '', basePrice, estimatedHours, categoryId],
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'invalid_category' });
    }
    const category = await pool.query('select name from service_categories where id = $1', [categoryId]);
    res.status(201).json({ ...rows[0], category: category.rows[0].name });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'service_exists' });
    }
    console.error('POST /service-catalog failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/service-catalog/:id', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const code = String(req.body.code || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  const categoryId = normalizeUuid(req.body.category_id);
  const basePrice = Number(req.body.base_price);
  const estimatedHours = Number(req.body.estimated_hours);
  if (!code || !name || !categoryId || !Number.isFinite(basePrice) || basePrice < 0 ||
      !Number.isFinite(estimatedHours) || estimatedHours < 0) {
    return res.status(400).json({ error: 'invalid_service' });
  }
  try {
    const { rows } = await pool.query(
      `update service_catalog sc
       set category_id = c.id, code = $1, name = $2, description = $3,
           base_price = $4, estimated_hours = $5, active = $6, updated_at = now()
       from service_categories c
       where sc.id = $7 and sc.company_id = $8
         and c.id = $9 and c.company_id = $8
       returning sc.id, sc.category_id, c.name as category, sc.code, sc.name,
                 sc.description, sc.base_price::float as base_price,
                 sc.estimated_hours::float as estimated_hours, sc.active,
                 sc.created_at, sc.updated_at`,
      [
        code, name, req.body.description || '', basePrice, estimatedHours,
        req.body.active !== false, req.params.id, companyId, categoryId,
      ],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'service_exists' });
    }
    console.error('PUT /service-catalog/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/workshop-users', authRequired, denyMechanicAccess, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select wu.id, wu.name, wu.rut, wu.email, wu.role_id, wu.role_name, wu.active, wu.created_at, wu.updated_at,
              coalesce(r.modules, '{}') as modules
       from workshop_users wu
       left join roles r on r.id = wu.role_id
       where wu.company_id = $1
       order by wu.created_at desc`,
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /workshop-users failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/workshop-users', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const rut = String(req.body.rut || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const roleName = String(req.body.role || req.body.role_name || '').trim();

  if (!name || !rut || !email || !password || !roleName) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  try {
    const roleResult = await pool.query(
      'select id, name from roles where company_id = $1 and name = $2 limit 1',
      [companyId, roleName]
    );
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: 'invalid_role' });
    }
    const role = roleResult.rows[0];
    const { rows } = await pool.query(
      `insert into workshop_users (company_id, name, rut, email, password_hash, role_id, role_name)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, name, rut, email, role_id, role_name, active, created_at, updated_at`,
      [companyId, name, rut, email, hashPassword(password), role.id, role.name]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'email_exists' });
    }
    console.error('POST /workshop-users failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/workshop-users/:id', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const rut = String(req.body.rut || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const roleName = String(req.body.role || req.body.role_name || '').trim();
  const active = req.body.active !== false;

  if (!name || !rut || !email || !roleName) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  try {
    const roleResult = await pool.query(
      'select id, name from roles where company_id = $1 and name = $2 limit 1',
      [companyId, roleName]
    );
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: 'invalid_role' });
    }
    const role = roleResult.rows[0];
    const { rows } = await pool.query(
      `update workshop_users
       set name = $1,
           rut = $2,
           email = $3,
           password_hash = case when $4 = '' then password_hash else $5 end,
           role_id = $6,
           role_name = $7,
           active = $8,
           updated_at = now()
       where id = $9 and company_id = $10
       returning id, name, rut, email, role_id, role_name, active, created_at, updated_at`,
      [
        name,
        rut,
        email,
        password,
        password ? hashPassword(password) : '',
        role.id,
        role.name,
        active,
        req.params.id,
        companyId,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'email_exists' });
    }
    console.error('PUT /workshop-users/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/workshop-users/:id', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      'delete from workshop_users where id = $1 and company_id = $2 returning id',
      [req.params.id, companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /workshop-users/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/inventory-items', authRequired, denyMechanicAccess, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
              cost::float as cost, sale_price::float as sale_price, status, supplier_id,
              warehouse, aisle, shelf, bin, notes, created_at, updated_at
       from inventory_items
       where company_id = $1
       order by name`,
      [companyId]
    );
    res.json(
      isMechanicRole(req.user.role)
        ? rows.map((item) => ({ ...item, cost: 0 }))
        : rows
    );
  } catch (error) {
    console.error('GET /inventory-items failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/inventory-items', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const itemType = req.body.item_type === 'insumo' ? 'insumo' : 'repuesto';
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    if (isMechanicRole(req.user.role)) {
      const { rows } = await pool.query(
        `update inventory_items
         set stock = $1, updated_at = now()
         where id = $2 and company_id = $3
         returning id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location,
                   ''::text as supplier, 0::float as cost, notes, created_at, updated_at`,
        [Number(req.body.stock) || 0, req.params.id, companyId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'not_found' });
      }
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      `insert into inventory_items
        (company_id, item_type, name, category, sku, barcode, stock, min_stock, unit, location, supplier, cost,
         sale_price, status, supplier_id, warehouse, aisle, shelf, bin, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       returning id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
                 cost::float as cost, sale_price::float as sale_price, status, supplier_id,
                 warehouse, aisle, shelf, bin, notes, created_at, updated_at`,
      [
        companyId,
        itemType,
        name,
        req.body.category || '',
        req.body.sku || '',
        req.body.barcode || '',
        Number(req.body.stock) || 0,
        Number(req.body.minStock ?? req.body.min_stock) || 0,
        req.body.unit || 'unidad',
        req.body.location || '',
        req.body.supplier || '',
        Number(req.body.cost) || 0,
        Number(req.body.sale_price) || 0,
        req.body.status || 'activo',
        normalizeUuid(req.body.supplier_id),
        req.body.warehouse || '',
        req.body.aisle || '',
        req.body.shelf || '',
        req.body.bin || '',
        req.body.notes || '',
      ]
    );
    if (Number(rows[0].stock) > 0) {
      await pool.query(
        `insert into inventory_movements
          (company_id, inventory_item_id, movement_type, quantity, stock_before, stock_after, reason, user_name)
         values ($1,$2,'inventario_inicial',$3,0,$3,'Registro inicial',$4)`,
        [
          companyId,
          rows[0].id,
          Number(rows[0].stock),
          req.user.full_name || req.user.name || req.user.email || '',
        ],
      );
    }
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'inventory_code_exists' });
    }
    console.error('POST /inventory-items failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/inventory-items/:id', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const itemType = req.body.item_type === 'insumo' ? 'insumo' : 'repuesto';
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const existingResult = await pool.query(
      'select stock from inventory_items where id = $1 and company_id = $2',
      [req.params.id, companyId],
    );
    if (!existingResult.rows.length) {
      return res.status(404).json({ error: 'not_found' });
    }
    const stockBefore = Number(existingResult.rows[0].stock) || 0;
    const stockAfter = Math.max(0, Number(req.body.stock) || 0);
    const { rows } = await pool.query(
      `update inventory_items
       set item_type = $1, name = $2, category = $3, sku = $4, barcode = $5, stock = $6, min_stock = $7,
           unit = $8, location = $9, supplier = $10, cost = $11, sale_price = $12, status = $13,
           supplier_id = $14, warehouse = $15, aisle = $16, shelf = $17, bin = $18,
           notes = $19, updated_at = now()
       where id = $20 and company_id = $21
       returning id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
                 cost::float as cost, sale_price::float as sale_price, status, supplier_id,
                 warehouse, aisle, shelf, bin, notes, created_at, updated_at`,
      [
        itemType,
        name,
        req.body.category || '',
        req.body.sku || '',
        req.body.barcode || '',
        stockAfter,
        Number(req.body.minStock ?? req.body.min_stock) || 0,
        req.body.unit || 'unidad',
        req.body.location || '',
        req.body.supplier || '',
        Number(req.body.cost) || 0,
        Number(req.body.sale_price) || 0,
        req.body.status || 'activo',
        normalizeUuid(req.body.supplier_id),
        req.body.warehouse || '',
        req.body.aisle || '',
        req.body.shelf || '',
        req.body.bin || '',
        req.body.notes || '',
        req.params.id,
        companyId,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    if (stockAfter !== stockBefore) {
      const delta = stockAfter - stockBefore;
      await pool.query(
        `insert into inventory_movements
          (company_id, inventory_item_id, movement_type, quantity, stock_before, stock_after,
           reason, vehicle_id, vehicle_patente, mechanic_name, user_name)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          companyId,
          req.params.id,
          req.body.movement_type || (delta > 0 ? 'entrada' : 'salida'),
          Math.abs(delta),
          stockBefore,
          stockAfter,
          req.body.movement_reason || req.body.reason || '',
          normalizeUuid(req.body.vehicle_id),
          req.body.vehicle_patente || '',
          req.body.mechanic_name || '',
          req.user.full_name || req.user.name || req.user.email || '',
        ],
      );
    }
    res.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'inventory_code_exists' });
    }
    console.error('PUT /inventory-items/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/inventory-items/:id', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      'delete from inventory_items where id = $1 and company_id = $2 returning id',
      [req.params.id, companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /inventory-items/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/inventory-movements', authRequired, denyMechanicAccess, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select m.*, m.quantity::float, m.stock_before::float, m.stock_after::float,
              i.name as item_name, i.sku
       from inventory_movements m
       join inventory_items i on i.id = m.inventory_item_id
       where m.company_id = $1
       order by m.created_at desc
       limit 500`,
      [req.user.company_id],
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /inventory-movements failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/inventory-suppliers', authRequired, denyMechanicAccess, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'select * from inventory_suppliers where company_id=$1 order by active desc, name',
      [req.user.company_id],
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /inventory-suppliers failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/inventory-suppliers', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'missing_name' });
  try {
    const { rows } = await pool.query(
      `insert into inventory_suppliers (company_id,name,rut,phone,email,address)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [req.user.company_id, name, req.body.rut || '', req.body.phone || '', req.body.email || '', req.body.address || ''],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'supplier_exists' });
    console.error('POST /inventory-suppliers failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/inventory-purchase-orders', authRequired, denyMechanicAccess, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select po.*, s.name as supplier_name,
              coalesce(json_agg(json_build_object(
                'id', pi.id, 'inventory_item_id', pi.inventory_item_id,
                'item_name', ii.name, 'quantity', pi.quantity::float,
                'received_quantity', pi.received_quantity::float,
                'unit_cost', pi.unit_cost::float
              )) filter (where pi.id is not null), '[]') as items
       from inventory_purchase_orders po
       left join inventory_suppliers s on s.id=po.supplier_id
       left join inventory_purchase_order_items pi on pi.purchase_order_id=po.id
       left join inventory_items ii on ii.id=pi.inventory_item_id
       where po.company_id=$1 group by po.id,s.name order by po.created_at desc`,
      [req.user.company_id],
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /inventory-purchase-orders failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/inventory-purchase-orders', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query(
      `insert into inventory_purchase_orders
        (company_id,supplier_id,order_number,order_date,expected_date,notes)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [
        req.user.company_id, normalizeUuid(req.body.supplier_id),
        req.body.order_number || `OC-${Date.now()}`,
        normalizeDateOnly(req.body.order_date) || new Date().toISOString().slice(0,10),
        normalizeDateOnly(req.body.expected_date), req.body.notes || '',
      ],
    );
    for (const item of items) {
      await client.query(
        `insert into inventory_purchase_order_items
          (purchase_order_id,inventory_item_id,quantity,unit_cost)
         values ($1,$2,$3,$4)`,
        [result.rows[0].id, item.inventory_item_id, Math.max(1,Number(item.quantity)||1), Math.max(0,Number(item.unit_cost)||0)],
      );
    }
    await client.query('commit');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('POST /inventory-purchase-orders failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.post('/inventory-purchase-orders/:id/receive', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const order = await client.query(
      'select * from inventory_purchase_orders where id=$1 and company_id=$2 for update',
      [req.params.id, req.user.company_id],
    );
    if (!order.rows.length) {
      await client.query('rollback');
      return res.status(404).json({ error: 'not_found' });
    }
    const items = await client.query(
      `select pi.*, ii.stock from inventory_purchase_order_items pi
       join inventory_items ii on ii.id=pi.inventory_item_id
       where pi.purchase_order_id=$1`,
      [req.params.id],
    );
    for (const item of items.rows) {
      const pending = Number(item.quantity) - Number(item.received_quantity);
      if (pending <= 0) continue;
      const before = Number(item.stock);
      const after = before + pending;
      await client.query('update inventory_items set stock=$1,cost=$2,updated_at=now() where id=$3', [after,item.unit_cost,item.inventory_item_id]);
      await client.query('update inventory_purchase_order_items set received_quantity=quantity where id=$1', [item.id]);
      await client.query(
        `insert into inventory_movements
          (company_id,inventory_item_id,movement_type,quantity,stock_before,stock_after,reason,user_name)
         values ($1,$2,'compra',$3,$4,$5,$6,$7)`,
        [req.user.company_id,item.inventory_item_id,pending,before,after,`Recepción ${order.rows[0].order_number}`,req.user.full_name || req.user.email || ''],
      );
    }
    await client.query(`update inventory_purchase_orders set status='recibida',updated_at=now() where id=$1`, [req.params.id]);
    await client.query('commit');
    res.json({ ok: true });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('POST /inventory-purchase-orders/:id/receive failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.get('/inventory-stock-counts', authRequired, denyMechanicAccess, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select sc.*, coalesce(json_agg(json_build_object(
        'id',ci.id,'inventory_item_id',ci.inventory_item_id,'item_name',ii.name,
        'expected_quantity',ci.expected_quantity::float,'counted_quantity',ci.counted_quantity::float
      )) filter (where ci.id is not null),'[]') as items
       from inventory_stock_counts sc
       left join inventory_stock_count_items ci on ci.stock_count_id=sc.id
       left join inventory_items ii on ii.id=ci.inventory_item_id
       where sc.company_id=$1 group by sc.id order by sc.created_at desc`,
      [req.user.company_id],
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /inventory-stock-counts failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/inventory-stock-counts', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query(
      `insert into inventory_stock_counts (company_id,notes,created_by)
       values ($1,$2,$3) returning *`,
      [req.user.company_id,req.body.notes || '',req.user.full_name || req.user.email || ''],
    );
    for (const item of items) {
      await client.query(
        `insert into inventory_stock_count_items
          (stock_count_id,inventory_item_id,expected_quantity,counted_quantity)
         values ($1,$2,$3,$4)`,
        [result.rows[0].id,item.inventory_item_id,Number(item.expected_quantity)||0,Number(item.counted_quantity)||0],
      );
    }
    await client.query('commit');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('POST /inventory-stock-counts failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.post('/inventory-stock-counts/:id/complete', authRequired, requireWorkshopAdmin, ensureWritable, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const count = await client.query(
      'select * from inventory_stock_counts where id=$1 and company_id=$2 and status=$3 for update',
      [req.params.id,req.user.company_id,'abierto'],
    );
    if (!count.rows.length) {
      await client.query('rollback');
      return res.status(404).json({ error: 'not_found' });
    }
    const items = await client.query(
      `select ci.*,ii.stock from inventory_stock_count_items ci
       join inventory_items ii on ii.id=ci.inventory_item_id where ci.stock_count_id=$1`,
      [req.params.id],
    );
    for (const item of items.rows) {
      const before=Number(item.stock), after=Number(item.counted_quantity);
      if (before === after) continue;
      await client.query('update inventory_items set stock=$1,updated_at=now() where id=$2',[after,item.inventory_item_id]);
      await client.query(
        `insert into inventory_movements
          (company_id,inventory_item_id,movement_type,quantity,stock_before,stock_after,reason,user_name)
         values ($1,$2,'conteo',$3,$4,$5,$6,$7)`,
        [req.user.company_id,item.inventory_item_id,Math.abs(after-before),before,after,'Ajuste por conteo físico',req.user.full_name || req.user.email || ''],
      );
    }
    await client.query(`update inventory_stock_counts set status='completado',completed_at=now() where id=$1`,[req.params.id]);
    await client.query('commit');
    res.json({ ok:true });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('POST /inventory-stock-counts/:id/complete failed', error);
    res.status(500).json({ error:'internal_error' });
  } finally {
    client.release();
  }
});

const budgetStatuses = new Set([
  'borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'convertido', 'anulado',
]);
const budgetItemTypes = new Set(['servicio', 'repuesto', 'insumo']);
const normalizeBudgetItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    item_type: budgetItemTypes.has(item.item_type) ? item.item_type : 'servicio',
    reference_id: normalizeUuid(item.reference_id),
    name: String(item.name || '').trim(),
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    unit_price: Math.max(0, Number(item.unit_price ?? item.price) || 0),
    estimated_hours: Math.max(0, Number(item.estimated_hours) || 0),
  })).filter((item) => item.name);

const reviewPartPrefix = '[REPUESTO]';
const parseInventoryUsage = (services) => {
  const usage = new Map();
  for (const service of Array.isArray(services) ? services : []) {
    if (typeof service !== 'string' || !service.startsWith(reviewPartPrefix)) continue;
    const [inventoryItemId, name, , quantity = '1'] = service
      .slice(reviewPartPrefix.length)
      .trim()
      .split('|')
      .map((value) => value.trim());
    if (!uuidRegex.test(inventoryItemId) || !name) continue;
    usage.set(
      inventoryItemId,
      (usage.get(inventoryItemId) || 0) + Math.max(1, Number.parseInt(quantity, 10) || 1),
    );
  }
  return usage;
};

const reconcileVehicleInventory = async ({
  client,
  companyId,
  vehicle,
  previousServices,
  nextServices,
  user,
}) => {
  const previousUsage = parseInventoryUsage(previousServices);
  const nextUsage = parseInventoryUsage(nextServices);
  const itemIds = new Set([...previousUsage.keys(), ...nextUsage.keys()]);

  for (const inventoryItemId of itemIds) {
    const delta =
      (nextUsage.get(inventoryItemId) || 0) -
      (previousUsage.get(inventoryItemId) || 0);
    if (delta === 0) continue;

    const itemResult = await client.query(
      `select id, name, stock
       from inventory_items
       where id = $1 and company_id = $2
       for update`,
      [inventoryItemId, companyId],
    );
    if (itemResult.rows.length === 0) {
      const error = new Error('inventory_item_not_found');
      error.status = 400;
      throw error;
    }

    const item = itemResult.rows[0];
    const stockBefore = Number(item.stock) || 0;
    const stockAfter = stockBefore - delta;
    if (stockAfter < 0) {
      const error = new Error('insufficient_inventory_stock');
      error.status = 409;
      error.itemName = item.name;
      throw error;
    }

    await client.query(
      `update inventory_items
       set stock = $1, updated_at = now()
       where id = $2 and company_id = $3`,
      [stockAfter, inventoryItemId, companyId],
    );
    await client.query(
      `insert into inventory_movements
        (company_id, inventory_item_id, movement_type, quantity, stock_before,
         stock_after, reason, vehicle_id, vehicle_patente, mechanic_name, user_name)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        companyId,
        inventoryItemId,
        delta > 0 ? 'consumo_taller' : 'devolucion_taller',
        Math.abs(delta),
        stockBefore,
        stockAfter,
        `Atención de vehículo ${vehicle.patente}`,
        vehicle.id,
        vehicle.patente,
        vehicle.assigned_mechanic_name || '',
        user.full_name || user.name || user.email || '',
      ],
    );
  }
};
app.get('/budgets', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  if (isMechanicRole(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const { rows } = await pool.query(
      `select b.*,
              b.total::float, b.discount_percent::float, b.tax_percent::float,
              b.advance_required::float,
              coalesce(json_agg(json_build_object(
                'id', bi.id, 'item_type', bi.item_type, 'reference_id', bi.reference_id,
                'name', bi.name, 'quantity', bi.quantity::float,
                'unit_price', bi.unit_price::float, 'price', bi.unit_price::float,
                'estimated_hours', bi.estimated_hours::float)
                order by bi.created_at) filter (where bi.id is not null), '[]') as items
       from budget_quotes b
       left join budget_quote_items bi on bi.budget_quote_id = b.id
       where b.company_id = $1
       group by b.id
       order by b.created_at desc`,
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /budgets failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/budgets', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  if (isMechanicRole(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const items = normalizeBudgetItems(req.body.items);
  const customerName = String(req.body.customerName || req.body.customer_name || '').trim();
  if (!customerName || customerName.length > customerNameMaxLength) {
    return res.status(400).json({ error: 'invalid_customer_name' });
  }
  const discountPercent = Math.min(100, Math.max(0, Number(req.body.discount_percent) || 0));
  const taxPercent = Math.min(100, Math.max(0, Number(req.body.tax_percent) || 0));
  const total = calculateBudgetTotal(items, discountPercent, taxPercent);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const budgetResult = await client.query(
      `insert into budget_quotes
        (company_id, customer_name, customer_rut, customer_phone, customer_email,
         customer_address, customer_city, patente, vehicle, notes, issue_date,
         expiry_date, discount_percent, tax_percent, advance_required,
         payment_method, terms, total, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       returning *`,
      [
        companyId,
        customerName,
        req.body.customer_rut || '',
        req.body.customerPhone || req.body.customer_phone || '',
        req.body.customer_email || '',
        req.body.customer_address || '',
        req.body.customer_city || '',
        req.body.patente || '',
        req.body.vehicle || '',
        req.body.notes || '',
        normalizeDateOnly(req.body.issue_date) || new Date().toISOString().slice(0, 10),
        normalizeDateOnly(req.body.expiry_date),
        discountPercent,
        taxPercent,
        Math.max(0, Number(req.body.advance_required) || 0),
        req.body.payment_method || '',
        req.body.terms || '',
        total,
        budgetStatuses.has(req.body.status) ? req.body.status : 'borrador',
      ]
    );
    const budget = budgetResult.rows[0];
    for (const item of items) {
      await client.query(
        `insert into budget_quote_items
          (budget_quote_id, item_type, reference_id, name, quantity, unit_price, price, estimated_hours)
         values ($1,$2,$3,$4,$5,$6,$6,$7)`,
        [budget.id, item.item_type, item.reference_id, item.name, item.quantity, item.unit_price, item.estimated_hours]
      );
    }
    await client.query('commit');
    res.status(201).json({ ...budget, items });
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    console.error('POST /budgets failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.put('/budgets/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  if (isMechanicRole(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const items = normalizeBudgetItems(req.body.items);
  const customerName = String(req.body.customerName || req.body.customer_name || '').trim();
  if (!customerName || customerName.length > customerNameMaxLength) {
    return res.status(400).json({ error: 'invalid_customer_name' });
  }
  const discountPercent = Math.min(100, Math.max(0, Number(req.body.discount_percent) || 0));
  const taxPercent = Math.min(100, Math.max(0, Number(req.body.tax_percent) || 0));
  const total = calculateBudgetTotal(items, discountPercent, taxPercent);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const budgetResult = await client.query(
      `update budget_quotes
       set customer_name=$1, customer_rut=$2, customer_phone=$3, customer_email=$4,
           customer_address=$5, customer_city=$6, patente=$7, vehicle=$8,
           notes=$9, issue_date=$10, expiry_date=$11, discount_percent=$12,
           tax_percent=$13, advance_required=$14, payment_method=$15, terms=$16,
           total=$17, status=$18, updated_at=now()
       where id=$19 and company_id=$20
       returning *`,
      [
        customerName,
        req.body.customer_rut || '',
        req.body.customerPhone || req.body.customer_phone || '',
        req.body.customer_email || '',
        req.body.customer_address || '',
        req.body.customer_city || '',
        req.body.patente || '',
        req.body.vehicle || '',
        req.body.notes || '',
        normalizeDateOnly(req.body.issue_date) || new Date().toISOString().slice(0, 10),
        normalizeDateOnly(req.body.expiry_date),
        discountPercent,
        taxPercent,
        Math.max(0, Number(req.body.advance_required) || 0),
        req.body.payment_method || '',
        req.body.terms || '',
        total,
        budgetStatuses.has(req.body.status) ? req.body.status : 'borrador',
        req.params.id,
        companyId,
      ]
    );
    if (budgetResult.rows.length === 0) {
      await client.query('rollback');
      return res.status(404).json({ error: 'not_found' });
    }
    await client.query('delete from budget_quote_items where budget_quote_id = $1', [req.params.id]);
    for (const item of items) {
      await client.query(
        `insert into budget_quote_items
          (budget_quote_id, item_type, reference_id, name, quantity, unit_price, price, estimated_hours)
         values ($1,$2,$3,$4,$5,$6,$6,$7)`,
        [req.params.id, item.item_type, item.reference_id, item.name, item.quantity, item.unit_price, item.estimated_hours]
      );
    }
    await client.query('commit');
    res.json({ ...budgetResult.rows[0], items });
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    console.error('PUT /budgets/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

app.delete('/budgets/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  if (isMechanicRole(req.user.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const { rows } = await pool.query(
      `update budget_quotes set status = 'anulado', updated_at = now()
       where id = $1 and company_id = $2 returning id`,
      [req.params.id, companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /budgets/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.patch('/budgets/:id/status', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const status = budgetStatuses.has(req.body.status) ? req.body.status : null;
  if (!status) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  try {
    const { rows } = await pool.query(
      `update budget_quotes
       set status = $1,
           converted_vehicle_id = coalesce($2, converted_vehicle_id),
           updated_at = now()
       where id = $3 and company_id = $4
       returning *`,
      [status, normalizeUuid(req.body.converted_vehicle_id), req.params.id, req.user.company_id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('PATCH /budgets/:id/status failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/audit-logs', authRequired, denyMechanicAccess, async (req, res) => {
  const { company_id: companyId } = req.user;
  const dateFrom = String(req.query.date_from || '').trim();
  const dateTo = String(req.query.date_to || '').trim();

  const filters = ['company_id = $1'];
  const values = [companyId];

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: 'invalid_date_from' });
    }
    values.push(fromDate.toISOString());
    filters.push(`created_at >= $${values.length}`);
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59.999Z`);
    if (Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'invalid_date_to' });
    }
    values.push(toDate.toISOString());
    filters.push(`created_at <= $${values.length}`);
  }

  try {
    const { rows } = await pool.query(
      `select id, user_name, module, action, detail, created_at
       from audit_logs
       where ${filters.join(' and ')}
       order by created_at desc
       limit 500`,
      values
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /audit-logs failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/audit-logs', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const userName = String(req.body.user_name || req.body.user || '').trim();
  const moduleName = String(req.body.module || '').trim();
  const action = String(req.body.action || '').trim();
  const detail = String(req.body.detail || '').trim();

  if (!userName || !moduleName || !action) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const { rows } = await pool.query(
      `insert into audit_logs (company_id, user_name, module, action, detail)
       values ($1, $2, $3, $4, $5)
       returning id, user_name, module, action, detail, created_at`,
      [companyId, userName, moduleName, action, detail]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /audit-logs failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/parking-releases', authRequired, denyMechanicAccess, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select id, vehicle_id, released_by, detail, created_at
       from parking_releases
       where company_id = $1
       order by created_at desc`,
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /parking-releases failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/parking-releases', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const vehicleId = String(req.body.vehicle_id || req.body.vehicleId || '').trim();
  const releasedBy = String(req.body.released_by || req.body.releasedBy || '').trim();
  const detail = String(req.body.detail || '').trim();

  if (!vehicleId) {
    return res.status(400).json({ error: 'missing_vehicle_id' });
  }

  try {
    const { rows } = await pool.query(
      `insert into parking_releases (company_id, vehicle_id, released_by, detail)
       values ($1, $2, $3, $4)
       on conflict (company_id, vehicle_id)
       do update set released_by = excluded.released_by, detail = excluded.detail, created_at = now()
       returning id, vehicle_id, released_by, detail, created_at`,
      [companyId, vehicleId, releasedBy, detail]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /parking-releases failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/parking-releases/:vehicleId', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      'delete from parking_releases where vehicle_id = $1 and company_id = $2 returning id',
      [req.params.vehicleId, companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /parking-releases/:vehicleId failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/vehicles', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;

  try {
    const { rows } = await pool.query(
      'select * from vehicles where company_id = $1 order by fecha_ingreso desc',
      [companyId]
    );
    res.json(rows.map((vehicle) => sanitizeVehicleForRole(vehicle, req.user.role)));
  } catch (error) {
    console.error('GET /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/vehicles', authRequired, denyMechanicAccess, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;

  if (!req.body.estado) {
    req.body.estado = 'Ingresado';
  }
  if (!Array.isArray(req.body.servicios)) {
    req.body.servicios = [];
  }
  req.body.patente = normalizePatente(req.body.patente);

  const errorMessage = validateVehicle(req.body);
  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }

  const {
    patente,
    marca,
    modelo,
    ano,
    tipo_vehiculo = 'Auto',
    codigo_vin = '',
    codigo_motor = '',
    color = '',
    kilometraje = 0,
    cantidad_combustible = 0,
    estado = 'Ingresado',
    customer_name = '',
    customer_rut = '',
    customer_phone = '',
    customer_address = '',
    customer_city = '',
    customer_email = '',
    assigned_mechanic_id = null,
    assigned_mechanic_name = '',
    customer_advance = 0,
    attention_priority = 'Normal',
    estimated_work_hours = 0,
    promised_delivery_date = null,
    customer_authorized = false,
    servicios = [],
    observaciones = '',
    comentario_tecnico = '',
    salida_confirmada = false,
    fecha_salida_confirmada = null,
    en_estacionamiento_manual = false,
  } = req.body;

  const parsedCustomerAdvance = Number(customer_advance);
  if (
    isWorkshopAdminRole(req.user.role) &&
    (!Number.isFinite(parsedCustomerAdvance) || parsedCustomerAdvance < 0)
  ) {
    return res.status(400).json({ error: 'invalid_customer_advance' });
  }
  const customerAdvanceToPersist = isWorkshopAdminRole(req.user.role)
    ? parsedCustomerAdvance
    : 0;
  const normalizedAttentionPriority = normalizeAttentionPriority(attention_priority);
  const parsedEstimatedWorkHours = normalizeEstimatedWorkHours(estimated_work_hours);
  const normalizedPromisedDeliveryDate = normalizeDateOnly(promised_delivery_date);
  if (promised_delivery_date && !normalizedPromisedDeliveryDate) {
    return res.status(400).json({ error: 'invalid_attention_planning' });
  }
  const customerAuthorized = customer_authorized === true;
  const customerAuthorizedAt = customerAuthorized ? new Date().toISOString() : null;

  try {
    let servicesToPersist = servicios;
    if (isMechanicRole(req.user.role)) {
      if (estado === 'Entregado' || Boolean(salida_confirmada)) {
        return res.status(403).json({ error: 'mechanic_cannot_close_vehicle' });
      }
      servicesToPersist = sanitizeServicesForMechanic(servicios || []);
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address, customer_city, customer_email, assigned_mechanic_id, assigned_mechanic_name, customer_advance, attention_priority, estimated_work_hours, promised_delivery_date, customer_authorized, customer_authorized_at, patente, marca, modelo, ano, tipo_vehiculo, codigo_vin, codigo_motor, color, kilometraje, cantidad_combustible, estado, servicios, observaciones, comentario_tecnico, salida_confirmada, fecha_salida_confirmada, en_estacionamiento_manual)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
       returning *`,
      [
        companyId,
        customer_name,
        customer_rut,
        customer_phone,
        customer_address,
        customer_city,
        customer_email,
        normalizeUuid(assigned_mechanic_id),
        assigned_mechanic_name,
        customerAdvanceToPersist,
        normalizedAttentionPriority,
        parsedEstimatedWorkHours,
        normalizedPromisedDeliveryDate,
        customerAuthorized,
        customerAuthorizedAt,
        patente,
        marca,
        modelo,
        ano,
        tipo_vehiculo,
        codigo_vin,
        codigo_motor,
        color,
        kilometraje,
        cantidad_combustible,
        estado,
        servicesToPersist,
        observaciones,
        comentario_tecnico,
        Boolean(salida_confirmada),
        fecha_salida_confirmada || null,
        Boolean(en_estacionamiento_manual),
      ]
      );

      await reconcileVehicleInventory({
        client,
        companyId,
        vehicle: rows[0],
        previousServices: [],
        nextServices: servicesToPersist,
        user: req.user,
      });

      if (estado === 'En Taller' && normalizeUuid(assigned_mechanic_id)) {
        const timerResult = await client.query(
        `update vehicles
         set work_timer_started_at = coalesce(work_timer_started_at, now())
         where id = $1 and company_id = $2
         returning *`,
        [rows[0].id, companyId]
        );
        if (timerResult.rows[0]) {
          rows[0] = timerResult.rows[0];
        }
      }

      await syncVehicleServices(
        client,
        companyId,
        rows[0].id,
        servicesToPersist,
        req.user.full_name || req.user.name || req.user.email || '',
        estado,
      );

      await client.query('commit');
      res.status(201).json(sanitizeVehicleForRole(rows[0], req.user.role));
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.message === 'insufficient_inventory_stock') {
      return res.status(409).json({
        error: 'insufficient_inventory_stock',
        item_name: error.itemName,
      });
    }
    if (error.message === 'inventory_item_not_found') {
      return res.status(400).json({ error: 'inventory_item_not_found' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'patente_exists' });
    }
    console.error('POST /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/vehicles/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const { id } = req.params;

  try {
    const existingResult = await pool.query(
      `select *
       from vehicles
       where id = $1 and company_id = $2`,
      [id, companyId]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    const existingVehicle = existingResult.rows[0];
    const mergedBody = {
      ...existingVehicle,
      ...req.body,
      patente: normalizePatente(req.body.patente || existingVehicle.patente),
      customer_name: req.body.customer_name || existingVehicle.customer_name || 'Sin cliente',
      customer_rut: req.body.customer_rut || existingVehicle.customer_rut || 'Sin RUT',
      customer_phone: req.body.customer_phone || existingVehicle.customer_phone || 'Sin telefono',
      customer_address: req.body.customer_address || existingVehicle.customer_address || 'Sin direccion',
      customer_city: req.body.customer_city || existingVehicle.customer_city || 'Sin ciudad',
      servicios: Array.isArray(req.body.servicios)
        ? req.body.servicios
        : Array.isArray(existingVehicle.servicios)
          ? existingVehicle.servicios
          : [],
    };

    const errorMessage = validateVehicle(mergedBody);
    if (errorMessage) {
      return res.status(400).json({ error: errorMessage });
    }

    const {
      patente,
      marca,
      modelo,
      ano,
      tipo_vehiculo = 'Auto',
      codigo_vin = '',
      codigo_motor = '',
      color = '',
      kilometraje = 0,
      cantidad_combustible = 0,
      estado,
      customer_name = '',
      customer_rut = '',
      customer_phone = '',
      customer_address = '',
      customer_city = '',
      customer_email = '',
      assigned_mechanic_id = null,
      assigned_mechanic_name = '',
      customer_advance = 0,
      attention_priority = 'Normal',
      estimated_work_hours = 0,
      promised_delivery_date = null,
      customer_authorized = false,
      servicios = [],
      observaciones = '',
      comentario_tecnico = '',
      salida_confirmada = false,
      fecha_salida_confirmada = null,
      en_estacionamiento_manual = false,
    } = mergedBody;

    const normalizedAttentionPriority = normalizeAttentionPriority(attention_priority);
    const parsedEstimatedWorkHours = normalizeEstimatedWorkHours(estimated_work_hours);
    const normalizedPromisedDeliveryDate = normalizeDateOnly(promised_delivery_date);
    if (promised_delivery_date && !normalizedPromisedDeliveryDate) {
      return res.status(400).json({ error: 'invalid_attention_planning' });
    }
    const customerAuthorized = customer_authorized === true;
    const customerAuthorizedAt = customerAuthorized
      ? existingVehicle.customer_authorized && existingVehicle.customer_authorized_at
        ? existingVehicle.customer_authorized_at
        : new Date().toISOString()
      : null;

    let customerAdvanceToPersist = Number(customer_advance);
    let servicesToPersist = servicios;
    if (isMechanicRole(req.user.role) && estado === 'Ingresado') {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (isMechanicRole(req.user.role) && Boolean(salida_confirmada)) {
      return res.status(403).json({ error: 'mechanic_cannot_confirm_exit' });
    }
    if (isWorkshopAdminRole(req.user.role)) {
      if (!Number.isFinite(customerAdvanceToPersist) || customerAdvanceToPersist < 0) {
        return res.status(400).json({ error: 'invalid_customer_advance' });
      }
    } else {
      customerAdvanceToPersist = Number(existingVehicle.customer_advance) || 0;
      if (isMechanicRole(req.user.role)) {
        servicesToPersist = mergeMechanicServicesWithStoredPrices(
          existingVehicle.servicios || [],
          servicios || []
        );
        servicesToPersist = await applyCatalogPricesToMissingServices(
          companyId,
          servicesToPersist,
        );
      }
    }

    const now = new Date();
    let workTimerStartedAt = existingVehicle.work_timer_started_at
      ? new Date(existingVehicle.work_timer_started_at)
      : null;
    let workElapsedSeconds = Math.max(
      0,
      Number(existingVehicle.work_elapsed_seconds) || 0,
    );
    const timerWasRunning = Boolean(
      workTimerStartedAt && !Number.isNaN(workTimerStartedAt.getTime()),
    );
    const timerShouldRun =
      estado === 'En Taller' && Boolean(normalizeUuid(assigned_mechanic_id));

    if (timerWasRunning && !timerShouldRun && workTimerStartedAt) {
      workElapsedSeconds += Math.max(
        0,
        Math.floor((now.getTime() - workTimerStartedAt.getTime()) / 1000),
      );
      workTimerStartedAt = null;
    } else if (!timerWasRunning && timerShouldRun) {
      workTimerStartedAt = now;
    }

    const client = await pool.connect();
    let rows;
    try {
      await client.query('begin');
      const lockedVehicleResult = await client.query(
        `select servicios
         from vehicles
         where id = $1 and company_id = $2
         for update`,
        [id, companyId],
      );
      if (lockedVehicleResult.rows.length === 0) {
        await client.query('rollback');
        return res.status(404).json({ error: 'not_found' });
      }

      await reconcileVehicleInventory({
        client,
        companyId,
        vehicle: {
          id,
          patente,
          assigned_mechanic_name,
        },
        previousServices: lockedVehicleResult.rows[0].servicios,
        nextServices: servicesToPersist,
        user: req.user,
      });

      const updateResult = await client.query(
      `update vehicles
       set customer_name = $1,
           customer_rut = $2,
           customer_phone = $3,
           customer_address = $4,
           customer_city = $5,
           customer_email = $6,
           assigned_mechanic_id = $7,
           assigned_mechanic_name = $8,
           customer_advance = $9,
           attention_priority = $10,
           estimated_work_hours = $11,
           promised_delivery_date = $12,
           customer_authorized = $13,
           customer_authorized_at = $14,
           patente = $15,
           marca = $16,
           modelo = $17,
           ano = $18,
           tipo_vehiculo = $19,
           codigo_vin = $20,
           codigo_motor = $21,
           color = $22,
           kilometraje = $23,
           cantidad_combustible = $24,
           estado = $25,
           servicios = $26,
           observaciones = $27,
           comentario_tecnico = $28,
           salida_confirmada = $29,
           fecha_salida_confirmada = $30,
           en_estacionamiento_manual = $31,
           updated_at = now()
       where id = $32 and company_id = $33
       returning *`,
      [
        customer_name,
        customer_rut,
        customer_phone,
        customer_address,
        customer_city,
        customer_email,
        normalizeUuid(assigned_mechanic_id),
        assigned_mechanic_name,
        customerAdvanceToPersist,
        normalizedAttentionPriority,
        parsedEstimatedWorkHours,
        normalizedPromisedDeliveryDate,
        customerAuthorized,
        customerAuthorizedAt,
        patente,
        marca,
        modelo,
        ano,
        tipo_vehiculo,
        codigo_vin,
        codigo_motor,
        color,
        kilometraje,
        cantidad_combustible,
        estado,
        servicesToPersist,
        observaciones,
        comentario_tecnico,
        Boolean(salida_confirmada),
        fecha_salida_confirmada || null,
        Boolean(en_estacionamiento_manual),
        id,
        companyId,
      ]
      );
      rows = updateResult.rows;

      if (rows.length === 0) {
        await client.query('rollback');
        return res.status(404).json({ error: 'not_found' });
      }
      await syncVehicleServices(
        client,
        companyId,
        id,
        servicesToPersist,
        req.user.full_name || req.user.name || req.user.email || '',
        estado,
      );

      const timerResult = await client.query(
      `update vehicles
       set work_timer_started_at = $1,
           work_elapsed_seconds = $2
       where id = $3 and company_id = $4
       returning *`,
      [
        workTimerStartedAt ? workTimerStartedAt.toISOString() : null,
        workElapsedSeconds,
        id,
        companyId,
      ]
      );

      await client.query('commit');
      res.json(sanitizeVehicleForRole(timerResult.rows[0] || rows[0], req.user.role));
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.message === 'insufficient_inventory_stock') {
      return res.status(409).json({
        error: 'insufficient_inventory_stock',
        item_name: error.itemName,
      });
    }
    if (error.message === 'inventory_item_not_found') {
      return res.status(400).json({ error: 'inventory_item_not_found' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'patente_exists' });
    }
    console.error('PUT /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/vehicles/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;

  try {
    const { rows } = await pool.query(
      'delete from vehicles where id = $1 and company_id = $2 returning *',
      [req.params.id, companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(JSON.stringify({
    type: 'unhandled_request_error',
    request_id: req.requestId,
    message: error.message,
  }));
  if (error.message === 'cors_origin_denied') {
    return res.status(403).json({ error: 'cors_origin_denied' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  res.status(500).json({ error: 'internal_error' });
});

const shutdown = async (signal) => {
  console.log(JSON.stringify({ type: 'shutdown_started', signal }));
  applicationReady = false;
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
  clearTimeout(forceExit);
  process.exit(0);
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  console.error(JSON.stringify({
    type: 'unhandled_rejection',
    message: error instanceof Error ? error.message : String(error),
  }));
});

ensureVehicleColumns()
  .then(() => {
    server = app.listen(port, () => {
      applicationReady = true;
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Vehicle schema initialization failed', error);
    process.exit(1);
  });
