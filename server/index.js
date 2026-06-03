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

const allowedStatuses = new Set(['En taller', 'En revision', 'Entregado']);
const allowedTipos = new Set(['Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon']);
const patenteRegex = /^(?:[A-Z]{2}-\d{4}|[A-Z]{4}-\d{2})$/;

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
  await pool.query(`
    alter table vehicles
      add column if not exists codigo_vin text,
      add column if not exists codigo_motor text,
      add column if not exists color text default '',
      add column if not exists fallas_detectadas text[] default '{}',
      add column if not exists comentario_tecnico text default ''
  `);
  await pool.query(`
    alter table vehicles
      drop constraint if exists vehicles_company_patente_unique
  `);
  await pool.query(`
    create index if not exists idx_vehicles_company_patente_fecha
      on vehicles(company_id, patente, fecha_ingreso desc)
  `);
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

app.get('/auth/me', (req, res) => {
  const payload = getTokenPayload(req, res);
  if (!payload) {
    return;
  }

  const { user_id, company_id } = payload;
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
    req.body.estado = 'En taller';
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
    estado = 'En taller',
    customer_name = '',
    customer_rut = '',
    customer_phone = '',
    customer_address = '',
    customer_city = '',
    servicios = [],
    fallas_detectadas = [],
    observaciones = '',
    comentario_tecnico = '',
  } = req.body;

  try {
    const { rows } = await pool.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address, customer_city, patente, marca, modelo, ano, tipo_vehiculo, codigo_vin, codigo_motor, color, kilometraje, cantidad_combustible, estado, servicios, fallas_detectadas, observaciones, comentario_tecnico)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       returning *`,
      [
        companyId,
        customer_name,
        customer_rut,
        customer_phone,
        customer_address,
        customer_city,
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
    servicios = [],
    fallas_detectadas = [],
    observaciones = '',
    comentario_tecnico = '',
  } = req.body;

  try {
    const { rows } = await pool.query(
      `update vehicles
       set customer_name = $1,
           customer_rut = $2,
           customer_phone = $3,
           customer_address = $4,
           customer_city = $5,
           patente = $6,
           marca = $7,
           modelo = $8,
           ano = $9,
           tipo_vehiculo = $10,
           codigo_vin = $11,
           codigo_motor = $12,
           color = $13,
           kilometraje = $14,
           cantidad_combustible = $15,
           estado = $16,
           servicios = $17,
           fallas_detectadas = $18,
           observaciones = $19,
           comentario_tecnico = $20,
           updated_at = now()
       where id = $21 and company_id = $22
       returning *`,
      [
        customer_name,
        customer_rut,
        customer_phone,
        customer_address,
        customer_city,
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
