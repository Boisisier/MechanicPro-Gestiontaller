import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

const supabaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl) {
  console.warn('DATABASE_URL is not set.');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('JWT_SECRET is not set.');
}

const demoCompanyName = process.env.DEMO_COMPANY_NAME || 'Demo Taller';
const demoUserName = process.env.DEMO_USER_NAME || 'Demo Cliente';
const demoUserEmail = process.env.DEMO_USER_EMAIL || 'demo@local';
const demoUserPassword = process.env.DEMO_USER_PASSWORD || 'demo1234';

const pool = new Pool({
  connectionString: supabaseUrl,
});

app.use(cors());
app.use(express.json());

const allowedStatuses = new Set(['Ingresado', 'En Taller', 'Entregado']);
const allowedTipos = new Set(['Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon']);
const patenteRegex = /^(?:[A-Z]{2}-\d{4}|[A-Z]{4}-\d{2})$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultRoles = [
  {
    name: 'Administrador de Taller',
    modules: ['Dashboard', 'Vehículos', 'Presupuesto', 'Inventario', 'Reportes', 'Configuración'],
  },
  {
    name: 'Administrativo',
    modules: ['Dashboard', 'Vehículos', 'Presupuesto', 'Reportes'],
  },
  {
    name: 'Mecánico',
    modules: ['Dashboard', 'Vehículos', 'Reportes'],
  },
];

const normalizePatente = (value = '') => {
  const normalized = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (normalized.length <= 2) {
    return normalized;
  }
  if (/^[A-Z]{2}\d/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }
  if (normalized.length <= 4) {
    return normalized;
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
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
      fallas_detectadas text[] not null default '{}',
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
    alter table vehicles
      add column if not exists codigo_vin text,
      add column if not exists codigo_motor text,
      add column if not exists color text default '',
      add column if not exists customer_email text default '',
      add column if not exists assigned_mechanic_id uuid,
      add column if not exists assigned_mechanic_name text default '',
      add column if not exists fallas_detectadas text[] default '{}',
      add column if not exists comentario_tecnico text default '',
      add column if not exists salida_confirmada boolean not null default false,
      add column if not exists fecha_salida_confirmada timestamptz,
      add column if not exists en_estacionamiento_manual boolean not null default false
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
    alter table inventory_items
      add column if not exists item_type text not null default 'repuesto'
  `);
  await pool.query("update vehicles set fallas_detectadas = '{}' where fallas_detectadas is null");
  await pool.query("alter table vehicles alter column fallas_detectadas set default '{}'");
  await pool.query('alter table vehicles alter column fallas_detectadas set not null');
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
  await pool.query('create index if not exists idx_audit_logs_company_created_at on audit_logs(company_id, created_at desc)');
  await pool.query('create index if not exists idx_parking_releases_company_vehicle on parking_releases(company_id, vehicle_id)');
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

app.get('/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.post('/auth/demo-login', async (req, res) => {
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

app.post('/auth/login', async (req, res) => {
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

app.get('/workshop-users', authRequired, async (req, res) => {
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

app.post('/workshop-users', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const rut = String(req.body.rut || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const roleName = String(req.body.role || req.body.role_name || '').trim();

  if (!name || !rut || !email || !password || !roleName) {
    return res.status(400).json({ error: 'missing_fields' });
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

app.put('/workshop-users/:id', authRequired, ensureWritable, async (req, res) => {
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

app.delete('/workshop-users/:id', authRequired, ensureWritable, async (req, res) => {
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

app.get('/inventory-items', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
              cost::float as cost, notes, created_at, updated_at
       from inventory_items
       where company_id = $1
       order by name`,
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /inventory-items failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/inventory-items', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const itemType = req.body.item_type === 'insumo' ? 'insumo' : 'repuesto';
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const { rows } = await pool.query(
      `insert into inventory_items
        (company_id, item_type, name, category, sku, barcode, stock, min_stock, unit, location, supplier, cost, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       returning id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
                 cost::float as cost, notes, created_at, updated_at`,
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
        req.body.notes || '',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'inventory_code_exists' });
    }
    console.error('POST /inventory-items failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/inventory-items/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  const name = String(req.body.name || '').trim();
  const itemType = req.body.item_type === 'insumo' ? 'insumo' : 'repuesto';
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }
  try {
    const { rows } = await pool.query(
      `update inventory_items
       set item_type = $1, name = $2, category = $3, sku = $4, barcode = $5, stock = $6, min_stock = $7,
           unit = $8, location = $9, supplier = $10, cost = $11, notes = $12, updated_at = now()
       where id = $13 and company_id = $14
       returning id, item_type, name, category, sku, barcode, stock, min_stock as "minStock", unit, location, supplier,
                 cost::float as cost, notes, created_at, updated_at`,
      [
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
        req.body.notes || '',
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
      return res.status(409).json({ error: 'inventory_code_exists' });
    }
    console.error('PUT /inventory-items/:id failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/inventory-items/:id', authRequired, ensureWritable, async (req, res) => {
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

app.get('/budgets', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select b.*,
              coalesce(json_agg(json_build_object('id', bi.id, 'name', bi.name, 'price', bi.price::float)
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
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const budgetResult = await client.query(
      `insert into budget_quotes (company_id, customer_name, customer_phone, patente, vehicle, notes, total, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        companyId,
        req.body.customerName || req.body.customer_name || '',
        req.body.customerPhone || req.body.customer_phone || '',
        req.body.patente || '',
        req.body.vehicle || '',
        req.body.notes || '',
        total,
        req.body.status || 'borrador',
      ]
    );
    const budget = budgetResult.rows[0];
    for (const item of items) {
      await client.query(
        'insert into budget_quote_items (budget_quote_id, name, price) values ($1, $2, $3)',
        [budget.id, item.name || '', Number(item.price) || 0]
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
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const budgetResult = await client.query(
      `update budget_quotes
       set customer_name = $1, customer_phone = $2, patente = $3, vehicle = $4,
           notes = $5, total = $6, status = $7, updated_at = now()
       where id = $8 and company_id = $9
       returning *`,
      [
        req.body.customerName || req.body.customer_name || '',
        req.body.customerPhone || req.body.customer_phone || '',
        req.body.patente || '',
        req.body.vehicle || '',
        req.body.notes || '',
        total,
        req.body.status || 'borrador',
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
        'insert into budget_quote_items (budget_quote_id, name, price) values ($1, $2, $3)',
        [req.params.id, item.name || '', Number(item.price) || 0]
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
  try {
    const { rows } = await pool.query(
      'delete from budget_quotes where id = $1 and company_id = $2 returning id',
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

app.get('/audit-logs', authRequired, async (req, res) => {
  const { company_id: companyId } = req.user;
  try {
    const { rows } = await pool.query(
      `select id, user_name, module, action, detail, created_at
       from audit_logs
       where company_id = $1
       order by created_at desc
       limit 500`,
      [companyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /audit-logs failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/audit-logs', authRequired, ensureWritable, async (req, res) => {
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

app.get('/parking-releases', authRequired, async (req, res) => {
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

app.post('/parking-releases', authRequired, ensureWritable, async (req, res) => {
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

app.delete('/parking-releases/:vehicleId', authRequired, ensureWritable, async (req, res) => {
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
    res.json(rows);
  } catch (error) {
    console.error('GET /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/vehicles', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;

  if (!req.body.estado) {
    req.body.estado = 'Ingresado';
  }
  if (!Array.isArray(req.body.servicios)) {
    req.body.servicios = [];
  }
  if (!Array.isArray(req.body.fallas_detectadas)) {
    req.body.fallas_detectadas = [];
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
    servicios = [],
    fallas_detectadas = [],
    observaciones = '',
    comentario_tecnico = '',
    salida_confirmada = false,
    fecha_salida_confirmada = null,
    en_estacionamiento_manual = false,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address, customer_city, customer_email, assigned_mechanic_id, assigned_mechanic_name, patente, marca, modelo, ano, tipo_vehiculo, codigo_vin, codigo_motor, color, kilometraje, cantidad_combustible, estado, servicios, fallas_detectadas, observaciones, comentario_tecnico, salida_confirmada, fecha_salida_confirmada, en_estacionamiento_manual)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
        servicios,
        fallas_detectadas,
        observaciones,
        comentario_tecnico,
        Boolean(salida_confirmada),
        fecha_salida_confirmada || null,
        Boolean(en_estacionamiento_manual),
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'patente_exists' });
    }
    console.error('POST /vehicles failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.put('/vehicles/:id', authRequired, ensureWritable, async (req, res) => {
  const { company_id: companyId } = req.user;
  req.body.patente = normalizePatente(req.body.patente);
  if (!Array.isArray(req.body.fallas_detectadas)) {
    req.body.fallas_detectadas = [];
  }

  const errorMessage = validateVehicle(req.body);
  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }

  const { id } = req.params;
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
    servicios = [],
    fallas_detectadas = [],
    observaciones = '',
    comentario_tecnico = '',
    salida_confirmada = false,
    fecha_salida_confirmada = null,
    en_estacionamiento_manual = false,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `update vehicles
       set customer_name = $1,
           customer_rut = $2,
           customer_phone = $3,
           customer_address = $4,
           customer_city = $5,
           customer_email = $6,
           assigned_mechanic_id = $7,
           assigned_mechanic_name = $8,
           patente = $9,
           marca = $10,
           modelo = $11,
           ano = $12,
           tipo_vehiculo = $13,
           codigo_vin = $14,
           codigo_motor = $15,
           color = $16,
           kilometraje = $17,
           cantidad_combustible = $18,
           estado = $19,
           servicios = $20,
           fallas_detectadas = $21,
           observaciones = $22,
           comentario_tecnico = $23,
           salida_confirmada = $24,
           fecha_salida_confirmada = $25,
           en_estacionamiento_manual = $26,
           updated_at = now()
       where id = $27 and company_id = $28
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
        servicios,
        fallas_detectadas,
        observaciones,
        comentario_tecnico,
        Boolean(salida_confirmada),
        fecha_salida_confirmada || null,
        Boolean(en_estacionamiento_manual),
        id,
        companyId,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json(rows[0]);
  } catch (error) {
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

ensureVehicleColumns()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Vehicle schema initialization failed', error);
    process.exit(1);
  });
