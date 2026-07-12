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
  const { createTestCompany, createTestVehicle, createTestBudget, cleanupTestCompany } =
    await import('./helpers.mjs');

  let server;
  let baseUrl;
  let companyA;
  let companyB;
  let vehicleA;
  let vehicleB;
  let budgetA;

  const login = (email, password) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  // El JWT y el token CSRF viajan por Set-Cookie, no en el body. El fetch nativo de Node (a
  // diferencia del navegador) sí deja setear el header Cookie a mano, así que no hace falta un
  // cookie-jar: se leen las cookies de la respuesta del login y se reenvían explícitamente.
  const extractCookies = (res) => {
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    const cookies = {};
    for (const entry of raw) {
      const pair = entry.split(';')[0];
      const separator = pair.indexOf('=');
      if (separator === -1) continue;
      cookies[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim();
    }
    return cookies;
  };

  const sessionFor = async (email, password) => {
    const res = await login(email, password);
    assert.equal(res.status, 200, `login falló para ${email}`);
    const cookies = extractCookies(res);
    assert.ok(cookies.auth_token, 'la respuesta de login debe traer auth_token en Set-Cookie');
    assert.ok(cookies.csrf_token, 'la respuesta de login debe traer csrf_token en Set-Cookie');
    return {
      cookieHeader: `auth_token=${cookies.auth_token}; csrf_token=${cookies.csrf_token}`,
      csrfToken: cookies.csrf_token,
    };
  };

  const authedFetch = (session, path, init = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Cookie: session.cookieHeader,
        ...(init.method && init.method !== 'GET' ? { 'X-CSRF-Token': session.csrfToken } : {}),
      },
    });

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
    vehicleB = await createTestVehicle(pool, companyB.companyId);
    budgetA = await createTestBudget(pool, companyA.companyId);
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

  test('login válido fija cookies de sesión y no expone el JWT en el body', async () => {
    const res = await login(companyA.adminEmail, companyA.adminPassword);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.company.id, companyA.companyId);
    assert.equal(body.token, undefined, 'el JWT no debe viajar en el body de la respuesta');
    const cookies = extractCookies(res);
    assert.ok(cookies.auth_token);
    assert.ok(cookies.csrf_token);
  });

  test('GET /vehicles sin cookie de sesión devuelve 401', async () => {
    const res = await fetch(`${baseUrl}/vehicles`);
    assert.equal(res.status, 401);
  });

  test('empresa A no ve vehículos de empresa B (aislamiento por RLS)', async () => {
    const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
    const sessionB = await sessionFor(companyB.adminEmail, companyB.adminPassword);

    const vehiclesA = await (await authedFetch(sessionA, '/vehicles')).json();
    assert.ok(vehiclesA.some((v) => v.id === vehicleA.id));
    assert.ok(vehiclesA.every((v) => v.company_id === companyA.companyId));

    const vehiclesB = await (await authedFetch(sessionB, '/vehicles')).json();
    assert.ok(vehiclesB.every((v) => v.id !== vehicleA.id));
    assert.ok(vehiclesB.every((v) => v.company_id === companyB.companyId));
  });

  test('POST /vehicles crea un vehículo dentro de la empresa de la sesión', async () => {
    const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
    const res = await authedFetch(sessionA, '/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  test('POST /vehicles sin header X-CSRF-Token devuelve 403', async () => {
    const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
    const res = await fetch(`${baseUrl}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionA.cookieHeader },
      body: JSON.stringify({
        customer_name: 'Cliente Sin CSRF',
        customer_rut: '11.111.111-1',
        customer_phone: '+56911111111',
        customer_address: 'Calle 1',
        customer_city: 'Santiago',
        patente: 'CC-3333',
        marca: 'Toyota',
        modelo: 'Yaris',
        ano: 2021,
        estado: 'Ingresado',
      }),
    });
    assert.equal(res.status, 403);
  });

  test('DELETE de un vehículo de otra empresa devuelve 404 y no lo borra', async () => {
    const sessionB = await sessionFor(companyB.adminEmail, companyB.adminPassword);
    const res = await authedFetch(sessionB, `/vehicles/${vehicleA.id}`, { method: 'DELETE' });
    assert.equal(res.status, 404);

    const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
    const stillThere = await (await authedFetch(sessionA, '/vehicles')).json();
    assert.ok(stillThere.some((v) => v.id === vehicleA.id));
  });

  test('POST /auth/logout limpia las cookies de sesión', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    assert.equal(res.status, 200);
    const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    assert.ok(setCookie.some((c) => c.startsWith('auth_token=;') || c.includes('auth_token=;')));
  });

  test('GET /public/vehicles/:token funciona sin cookie de sesión y devuelve la empresa correcta', async () => {
    const resA = await fetch(`${baseUrl}/public/vehicles/${vehicleA.public_token}`);
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    assert.equal(bodyA.patente, vehicleA.patente);

    const resB = await fetch(`${baseUrl}/public/vehicles/${vehicleB.public_token}`);
    assert.equal(resB.status, 200);
    const bodyB = await resB.json();
    assert.equal(bodyB.patente, vehicleB.patente);
    assert.notEqual(bodyB.patente, bodyA.patente);
  });

  test('GET /public/vehicles/:token con un token inexistente devuelve 404', async () => {
    const res = await fetch(`${baseUrl}/public/vehicles/00000000-0000-4000-8000-000000000000`);
    assert.equal(res.status, 404);
  });

  test('GET /public/budgets/:token funciona sin cookie y trae los ítems', async () => {
    const res = await fetch(`${baseUrl}/public/budgets/${budgetA.public_token}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'enviado');
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].name, 'Cambio de aceite');
  });

  test('POST /public/budgets/:token/respond aprueba el presupuesto y bloquea una segunda respuesta', async () => {
    const res = await fetch(`${baseUrl}/public/budgets/${budgetA.public_token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'aprobado');
    assert.ok(body.customer_responded_at);

    const second = await fetch(`${baseUrl}/public/budgets/${budgetA.public_token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: false }),
    });
    assert.equal(second.status, 409);
    const secondBody = await second.json();
    assert.equal(secondBody.status, 'aprobado', 'el segundo intento no debe cambiar el estado');

    const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
    const stored = await (await authedFetch(sessionA, '/budgets')).json();
    const stillAprobado = stored.find((b) => b.id === budgetA.id);
    assert.equal(stillAprobado.status, 'aprobado');
  });
}
