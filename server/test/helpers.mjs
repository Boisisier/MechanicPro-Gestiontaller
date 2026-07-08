import crypto from 'node:crypto';

// Import diferido: solo se resuelve cuando una de estas funciones se llama, para que
// server/index.js (que lee DATABASE_URL/JWT_SECRET al importarse) se evalúe después de que el
// test haya mapeado TEST_DATABASE_URL -> DATABASE_URL, nunca antes.
let serverModulePromise;
const loadServer = () => {
  if (!serverModulePromise) {
    serverModulePromise = import('../index.js');
  }
  return serverModulePromise;
};

const randomPatente = () => {
  const letters = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + crypto.randomInt(0, 26)),
  ).join('');
  const digits = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
  return `${letters}-${digits}`;
};

export const createTestCompany = async (pool, name) => {
  const { hashPassword, seedDefaultRoles } = await loadServer();
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: companyRows } = await client.query(
      'insert into companies (name) values ($1) returning id',
      [name],
    );
    const companyId = companyRows[0].id;

    // company_id recién creado: hay que fijar el contexto de tenant explícitamente en este
    // cliente, igual que hace setTenantContext en server/index.js para los flujos de login.
    await client.query('select set_config($1, $2, false)', [
      'app.current_company_id',
      companyId,
    ]);
    await seedDefaultRoles(client, companyId);

    const { rows: roleRows } = await client.query(
      `select id from roles where company_id = $1 and name = 'Administrador de Taller'`,
      [companyId],
    );

    const adminEmail = `admin+${crypto.randomUUID()}@test.local`;
    const adminPassword = 'Test1234!Segura';
    await client.query(
      `insert into workshop_users (company_id, name, email, password_hash, role_id, role_name)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        companyId,
        'Admin de prueba',
        adminEmail,
        hashPassword(adminPassword),
        roleRows[0].id,
        'Administrador de Taller',
      ],
    );

    await client.query('commit');
    return { companyId, adminEmail, adminPassword };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

export const cleanupTestCompany = async (pool, companyId) => {
  // FK ON DELETE CASCADE se lleva roles, workshop_users, vehicles, etc. de esta empresa.
  await pool.query('delete from companies where id = $1', [companyId]);
};

export const createTestVehicle = async (pool, companyId, overrides = {}) => {
  const client = await pool.connect();
  try {
    await client.query('select set_config($1, $2, false)', [
      'app.current_company_id',
      companyId,
    ]);
    const { rows } = await client.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address,
         customer_city, patente, marca, modelo, ano, tipo_vehiculo, estado)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning id, patente, company_id`,
      [
        companyId,
        overrides.customer_name || 'Cliente de prueba',
        overrides.customer_rut || '11.111.111-1',
        overrides.customer_phone || '+56911111111',
        overrides.customer_address || 'Calle de prueba 123',
        overrides.customer_city || 'Santiago',
        overrides.patente || randomPatente(),
        overrides.marca || 'Toyota',
        overrides.modelo || 'Yaris',
        overrides.ano || 2021,
        overrides.tipo_vehiculo || 'Auto',
        overrides.estado || 'Ingresado',
      ],
    );
    return rows[0];
  } finally {
    client.release();
  }
};
