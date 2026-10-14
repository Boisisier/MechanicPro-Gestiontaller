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
  // Las protecciones de la Fase 3 impiden borrar una empresa que tenga partidas aprobadas, y
  // lo hacen a propósito: budget_quote_item_approvals referencia budget_quote_items con
  // ON DELETE RESTRICT, y el trigger guard_budget_quote_item_approval aborta el DELETE de una
  // partida en estado 'aprobado' (los triggers también se disparan en un borrado en cascada).
  // En producción eso es exactamente lo que se busca —que no se pueda hacer desaparecer el
  // rastro de lo que el cliente aprobó—, pero acá hay que levantarlo para poder limpiar.
  //
  // Hace falta fijar el contexto de tenant: a diferencia del DELETE en cascada (que es una
  // acción de integridad referencial y no pasa por RLS), estas dos sentencias son queries
  // normales y sin contexto no verían ninguna fila.
  const client = await pool.connect();
  try {
    await client.query('select set_config($1, $2, false)', [
      'app.current_company_id',
      companyId,
    ]);
    await client.query('delete from budget_quote_item_approvals where company_id = $1', [
      companyId,
    ]);
    await client.query(
      `update budget_quote_items set approval_status = 'pendiente'
       where budget_quote_id in (select id from budget_quotes where company_id = $1)`,
      [companyId],
    );
  } finally {
    client.release();
  }
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
    // fecha_salida_confirmada + public_token_expiry_days se pasan explícitamente para poder
    // fabricar un vehículo con el token ya vencido: el trigger
    // trg_vehicle_public_token_expiry (20260916000000) calcula public_token_expires_at en el
    // INSERT a partir de esas dos columnas, así que una salida en el pasado con una ventana
    // corta deja el token vencido sin tocar la columna a mano.
    const { rows } = await client.query(
      `insert into vehicles
        (company_id, customer_name, customer_rut, customer_phone, customer_address,
         customer_city, patente, marca, modelo, ano, tipo_vehiculo, estado,
         fecha_salida_confirmada, public_token_expiry_days)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning id, patente, company_id, public_token, public_token_expires_at`,
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
        overrides.fecha_salida_confirmada ?? null,
        overrides.public_token_expiry_days ?? 60,
      ],
    );
    return rows[0];
  } finally {
    client.release();
  }
};

export const createTestBudget = async (pool, companyId, overrides = {}) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1, $2, false)', [
      'app.current_company_id',
      companyId,
    ]);
    const { rows } = await client.query(
      `insert into budget_quotes
        (company_id, customer_name, customer_phone, patente, vehicle, status, total,
         converted_vehicle_id, discount_percent, tax_percent)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id, company_id, status, public_token, converted_vehicle_id`,
      [
        companyId,
        overrides.customer_name || 'Cliente de prueba',
        overrides.customer_phone || '+56911111111',
        overrides.patente || randomPatente(),
        overrides.vehicle || 'Toyota Yaris',
        overrides.status || 'enviado',
        overrides.total ?? 50000,
        // Vincular el presupuesto a una orden es lo que lo hace visible en la página pública
        // de estado (/public/estado/:token lo resuelve por converted_vehicle_id).
        overrides.converted_vehicle_id ?? null,
        overrides.discount_percent ?? 0,
        // 19 es el default de la columna y el IVA real de Chile: los tests corren sobre datos
        // con la misma forma que los de producción.
        overrides.tax_percent ?? 19,
      ],
    );
    const budget = rows[0];
    // Una sola partida por defecto (lo que esperan los tests del flujo viejo de
    // /public/budgets/:token). Los tests de aprobación por partida pasan varias con itemNames,
    // para poder aprobar una y verificar que las demás siguen en 'pendiente'.
    const itemNames = overrides.itemNames || ['Cambio de aceite'];
    const { rows: itemRows } = await client.query(
      `insert into budget_quote_items (budget_quote_id, item_type, name, quantity, unit_price, price)
       select $1, 'servicio', name, 1, $2, $2 from unnest($3::text[]) as name
       returning id, name, approval_status`,
      [budget.id, overrides.total ?? 50000, itemNames],
    );
    await client.query('commit');
    return { ...budget, items: itemRows };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

// Estado de suscripción de la empresa (20261013000000_company_subscription_state.sql). El
// servidor cachea este valor en memoria por 30s, así que los tests que lo cambian tienen que
// invalidar ese cache — ver forgetSubscriptionStatus en server/index.js.
export const setSubscriptionStatus = async (pool, companyId, status) => {
  const { forgetSubscriptionStatus } = await loadServer();
  await pool.query(
    `update companies
     set subscription_status = $2,
         subscription_suspended_at = case when $2 = 'activa' then null else now() end
     where id = $1`,
    [companyId, status],
  );
  forgetSubscriptionStatus(companyId);
};
