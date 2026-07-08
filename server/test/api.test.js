import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  test(
    'tests de integración de la API (requiere TEST_DATABASE_URL)',
    { skip: 'define TEST_DATABASE_URL para correr estos tests, ver docs/produccion.md' },
    () => {},
  );
} else {
  // Hay que fijar esto ANTES de importar server/index.js: ese módulo lee DATABASE_URL/JWT_SECRET
  // al evaluarse (loadConfig()), así que no puede ser un import estático de este archivo.
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test_jwt_secret_de_al_menos_32_caracteres_para_ci';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173';
  process.env.DATABASE_SSL = process.env.DATABASE_SSL || 'disable';
  process.env.ALLOW_DEMO_LOGIN = 'false';

  const { app, pool, ensureSchemaReady } = await import('../index.js');
  const { createTestCompany, createTestVehicle, cleanupTestCompany } = await import(
    './helpers.mjs'
  );

  let server;
  let baseUrl;
  let companyA;
  let companyB;
  let vehicleA;

  const login = (email, password) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const tokenFor = async (email, password) => {
    const res = await login(email, password);
    assert.equal(res.status, 200, `login falló para ${email}`);
    const body = await res.json();
    return body.token;
  };

  before(async () => {
    await ensureSchemaReady();
    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    companyA = await createTestCompany(pool, `Test A ${Date.now()}`);
    companyB = await createTestCompany(pool, `Test B ${Date.now()}`);
    vehicleA = await createTestVehicle(pool, companyA.companyId);
  });

  after(async () => {
    await cleanupTestCompany(pool, companyA.companyId);
    await cleanupTestCompany(pool, companyB.companyId);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  test('GET /health/live responde 200', async () => {
    const res = await fetch(`${baseUrl}/health/live`);
    assert.equal(res.status, 200);
  });

  test('login con credenciales inválidas devuelve 401', async () => {
    const res = await login('no-existe@test.local', 'lo-que-sea');
    assert.equal(res.status, 401);
  });

  test('login válido devuelve token con el company_id correcto', async () => {
    const res = await login(companyA.adminEmail, companyA.adminPassword);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.company.id, companyA.companyId);
    assert.ok(body.token);
  });

  test('GET /vehicles sin token devuelve 401', async () => {
    const res = await fetch(`${baseUrl}/vehicles`);
    assert.equal(res.status, 401);
  });

  test('empresa A no ve vehículos de empresa B (aislamiento por RLS)', async () => {
    const tokenA = await tokenFor(companyA.adminEmail, companyA.adminPassword);
    const tokenB = await tokenFor(companyB.adminEmail, companyB.adminPassword);

    const vehiclesA = await (
      await fetch(`${baseUrl}/vehicles`, { headers: { Authorization: `Bearer ${tokenA}` } })
    ).json();
    assert.ok(vehiclesA.some((v) => v.id === vehicleA.id));
    assert.ok(vehiclesA.every((v) => v.company_id === companyA.companyId));

    const vehiclesB = await (
      await fetch(`${baseUrl}/vehicles`, { headers: { Authorization: `Bearer ${tokenB}` } })
    ).json();
    assert.ok(vehiclesB.every((v) => v.id !== vehicleA.id));
    assert.ok(vehiclesB.every((v) => v.company_id === companyB.companyId));
  });

  test('POST /vehicles crea un vehículo dentro de la empresa del token', async () => {
    const tokenA = await tokenFor(companyA.adminEmail, companyA.adminPassword);
    const res = await fetch(`${baseUrl}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        customer_name: 'Cliente Nuevo',
        customer_rut: '11.111.111-1',
        customer_phone: '+56911111111',
        customer_address: 'Calle 1',
        customer_city: 'Santiago',
        patente: 'BB-2222',
        marca: 'Toyota',
        modelo: 'Yaris',
        ano: 2021,
        estado: 'Ingresado',
      }),
    });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.company_id, companyA.companyId);
  });

  test('DELETE de un vehículo de otra empresa devuelve 404 y no lo borra', async () => {
    const tokenB = await tokenFor(companyB.adminEmail, companyB.adminPassword);
    const res = await fetch(`${baseUrl}/vehicles/${vehicleA.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 404);

    const tokenA = await tokenFor(companyA.adminEmail, companyA.adminPassword);
    const stillThere = await (
      await fetch(`${baseUrl}/vehicles`, { headers: { Authorization: `Bearer ${tokenA}` } })
    ).json();
    assert.ok(stillThere.some((v) => v.id === vehicleA.id));
  });
}
