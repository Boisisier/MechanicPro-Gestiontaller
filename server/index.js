import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set.');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('JWT_SECRET is not set.');
}

const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;
if (!ownerEmail || !ownerPassword) {
  console.warn('OWNER_EMAIL or OWNER_PASSWORD is not set.');
}

const appUrl = process.env.APP_URL || 'http://localhost:5173';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

const allowedStatuses = new Set(['En taller', 'En revision', 'Entregado']);
const allowedTipos = new Set(['Auto', 'Camioneta', 'SUV', 'Moto', 'Camion', 'Furgon']);
const allowedRoles = new Set(['admin', 'mecanico', 'recepcionista']);
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateVehicle = (payload) => {
  const requiredFields = ['patente', 'marca', 'modelo', 'ano', 'tipo_vehiculo', 'estado'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return `Missing field: ${field}`;
    }
  }
  if (!allowedTipos.has(payload.tipo_vehiculo)) {
    return 'Invalid tipo_vehiculo';
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

const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length != bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
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

const ownerRequired = (req, res, next) => {
  const payload = getTokenPayload(req, res);
  if (!payload) {
    return;
  }
  if (!payload.owner) {
    return res.status(403).json({ error: 'owner_required' });
  }
  req.user = payload;
  return next();
};

const ensureWritable = (req, res, next) => {
  if (req.user?.support) {
    return res.status(403).json({ error: 'read_only_support' });
  }
  return next();
};

app.get('/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.post('/auth/owner/login', async (req, res) => {
  if (!ensureJwtSecret(res)) {
    return;
  }
  if (!ownerEmail || !ownerPassword) {
    return res.status(500).json({ error: 'owner_not_configured' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  if (!safeCompare(email, ownerEmail) || !safeCompare(password, ownerPassword)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = jwt.sign({ owner: true, role: 'owner', owner_email: email }, jwtSecret, {
    expiresIn: '12h',
  });
  res.json({ token, role: 'owner' });
});

app.post('/auth/login', async (req, res) => {
  if (!ensureJwtSecret(res)) {
    return;
  }

  const { email, password, company_id } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (company_id && !uuidRegex.test(company_id)) {
    return res.status(400).json({ error: 'invalid_company_id' });
  }

  try {
    const userResult = await pool.query(
      'select id, full_name, email, password_hash from users where email = $1',
      [email]
    );
    const user = userResult.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    let membershipQuery =
      'select cm.company_id, cm.role, c.name as company_name from company_members cm join companies c on c.id = cm.company_id where cm.user_id = $1';
    const params = [user.id];
    if (company_id) {
      membershipQuery += ' and cm.company_id = $2';
      params.push(company_id);
    }

    const membershipResult = await pool.query(membershipQuery, params);
    if (membershipResult.rows.length === 0) {
      return res.status(403).json({ error: 'no_company' });
    }
    if (!company_id && membershipResult.rows.length > 1) {
      return res.status(409).json({
        error: 'multiple_companies',
        companies: membershipResult.rows.map((row) => ({
          id: row.company_id,
          name: row.company_name,
          role: row.role,
        })),
      });
    }

    const membership = membershipResult.rows[0];
    const token = jwt.sign(
      { user_id: user.id, company_id: membership.company_id, role: membership.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email },
      company: { id: membership.company_id, name: membership.company_name },
      role: membership.role,
    });
  } catch (error) {
    console.error('POST /auth/login failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/auth/invitations/accept', async (req, res) => {
  if (!ensureJwtSecret(res)) {
    return;
  }

  const { token, full_name, password } = req.body;
  if (!token || !full_name || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const { rows: inviteRows } = await pool.query(
      'select * from invitations where token = $1 and used_at is null and expires_at > now()',
      [token]
    );
    if (inviteRows.length === 0) {
      return res.status(400).json({ error: 'invalid_invite' });
    }

    const invite = inviteRows[0];
    const existingUser = await pool.query('select id from users where email = $1', [invite.email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'user_exists' });
    }

    const passwordHash = hashPassword(password);

    await pool.query('begin');
    const userResult = await pool.query(
      'insert into users (full_name, email, password_hash) values ($1, $2, $3) returning id, full_name, email',
      [full_name, invite.email, passwordHash]
    );

    const user = userResult.rows[0];
    await pool.query(
      'insert into company_members (company_id, user_id, role) values ($1, $2, $3)',
      [invite.company_id, user.id, invite.role]
    );

    await pool.query('update invitations set used_at = now() where id = $1', [invite.id]);
    await pool.query('commit');

    const tokenValue = jwt.sign(
      { user_id: user.id, company_id: invite.company_id, role: invite.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      token: tokenValue,
      user: { id: user.id, full_name: user.full_name, email: user.email },
      company: { id: invite.company_id },
      role: invite.role,
    });
  } catch (error) {
    try {
      await pool.query('rollback');
    } catch {
      // ignore rollback errors
    }
    console.error('POST /auth/invitations/accept failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/auth/me', (req, res) => {
  const payload = getTokenPayload(req, res);
  if (!payload) {
    return;
  }

  if (payload.owner) {
    return res.json({ role: payload.support ? 'support' : 'owner', support: !!payload.support, company_id: payload.company_id });
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
        support: !!payload.support,
      });
    })
    .catch((error) => {
      console.error('GET /auth/me failed', error);
      res.status(500).json({ error: 'internal_error' });
    });
});

app.get('/admin/companies', ownerRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'select id, name, created_at from companies order by created_at desc'
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /admin/companies failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/admin/companies', ownerRequired, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }

  try {
    const { rows } = await pool.query(
      'insert into companies (name) values ($1) returning *',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /admin/companies failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/admin/invitations', ownerRequired, async (req, res) => {
  const { company_id, email, role } = req.body;
  if (!company_id || !email || !role) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!uuidRegex.test(company_id)) {
    return res.status(400).json({ error: 'invalid_company_id' });
  }
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: 'invalid_role' });
  }

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const { rows } = await pool.query(
      `insert into invitations (company_id, email, role, token, expires_at)
       values ($1, $2, $3, $4, now() + interval '7 days')
       returning id, token`,
      [company_id, email, role, token]
    );
    const inviteUrl = `${appUrl}/?invite=${rows[0].token}`;
    res.status(201).json({ token: rows[0].token, invite_url: inviteUrl });
  } catch (error) {
    console.error('POST /admin/invitations failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/admin/impersonate', ownerRequired, async (req, res) => {
  const { company_id } = req.body;
  if (!company_id || !uuidRegex.test(company_id)) {
    return res.status(400).json({ error: 'invalid_company_id' });
  }

  try {
    const { rows } = await pool.query('select id, name from companies where id = $1', [
      company_id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'company_not_found' });
    }

    const tokenValue = jwt.sign(
      {
        owner: true,
        support: true,
        role: 'support',
        company_id,
        owner_email: req.user.owner_email || 'owner',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    await pool.query(
      `insert into support_sessions (company_id, owner_email, token, expires_at)
       values ($1, $2, $3, now() + interval '1 hour')`,
      [company_id, req.user.owner_email || 'owner', tokenValue]
    );

    res.json({ token: tokenValue, company: rows[0] });
  } catch (error) {
    console.error('POST /admin/impersonate failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/admin/support-sessions', ownerRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select ss.id, ss.company_id, c.name as company_name, ss.owner_email, ss.created_at, ss.expires_at, ss.ended_at
       from support_sessions ss
       join companies c on c.id = ss.company_id
       order by ss.created_at desc
       limit 50`
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /admin/support-sessions failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/companies', ownerRequired, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'missing_name' });
  }

  try {
    const { rows } = await pool.query(
      'insert into companies (name) values ($1) returning *',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /companies failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/users', ownerRequired, async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const passwordHash = hashPassword(password);
    const { rows } = await pool.query(
      'insert into users (full_name, email, password_hash) values ($1, $2, $3) returning id, full_name, email, created_at',
      [full_name, email, passwordHash]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'email_exists' });
    }
    console.error('POST /users failed', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/companies/:companyId/members', ownerRequired, async (req, res) => {
  const { companyId } = req.params;
  if (!uuidRegex.test(companyId)) {
    return res.status(400).json({ error: 'invalid_company_id' });
  }

  let { user_id, role } = req.body;
  if (!user_id || !role) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  if (role === 'recpcionista') {
    role = 'recepcionista';
  }

  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: 'invalid_role' });
  }

  if (!uuidRegex.test(user_id)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  try {
    const { rows } = await pool.query(
      'insert into company_members (company_id, user_id, role) values ($1, $2, $3) returning *',
      [companyId, user_id, role]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'member_exists' });
    }
    console.error('POST /companies/:companyId/members failed', error);
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
    req.body.estado = 'En taller';
  }
  if (!Array.isArray(req.body.servicios)) {
    req.body.servicios = [];
  }

  const errorMessage = validateVehicle(req.body);
  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }

  const {
    patente,
    marca,
    modelo,
    ano,
    tipo_vehiculo,
    kilometraje = 0,
    cantidad_combustible = 0,
    estado = 'En taller',
    customer_name = '',
    customer_rut = '',
    customer_phone = '',
    customer_address = '',
    customer_city = '',
    servicios = [],
    observaciones = '',
  } = req.body;

  try {
    const { rows } = await pool.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address, customer_city, patente, marca, modelo, ano, tipo_vehiculo, kilometraje, cantidad_combustible, estado, servicios, observaciones)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        kilometraje,
        cantidad_combustible,
        estado,
        servicios,
        observaciones,
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
    tipo_vehiculo,
    kilometraje = 0,
    cantidad_combustible = 0,
    estado,
    customer_name = '',
    customer_rut = '',
    customer_phone = '',
    customer_address = '',
    customer_city = '',
    servicios = [],
    observaciones = '',
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
           kilometraje = $11,
           cantidad_combustible = $12,
           estado = $13,
           servicios = $14,
           observaciones = $15,
           updated_at = now()
       where id = $16 and company_id = $17
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
        kilometraje,
        cantidad_combustible,
        estado,
        servicios,
        observaciones,
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

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
