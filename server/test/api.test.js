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
  const {
    createTestCompany,
    createTestVehicle,
    createTestBudget,
    cleanupTestCompany,
    setSubscriptionStatus,
  } = await import('./helpers.mjs');

  let server;
  let baseUrl;
  let companyA;
  let companyB;
  let vehicleA;
  let vehicleB;
  let budgetA;
  // Portal de clientes (Fases 1-4): una orden con presupuesto vinculado, otra con el token ya
  // vencido, y una empresa aparte para los tests de suspensión (así suspenderla no interfiere
  // con el resto, y además usa su propio cupo del rate limiter de login).
  let vehicleEstado;
  let budgetEstado;
  let budgetAnulado;
  let vehicleOtraOrden;
  let budgetOtraOrden;
  let vehicleVencido;
  let companySuspendible;

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

    vehicleEstado = await createTestVehicle(pool, companyA.companyId);
    budgetEstado = await createTestBudget(pool, companyA.companyId, {
      converted_vehicle_id: vehicleEstado.id,
      status: 'convertido',
      itemNames: ['Cambio de aceite', 'Alineación y balanceo'],
    });
    // Mismo vehículo, pero este presupuesto está anulado: no tiene que aparecer en la página.
    budgetAnulado = await createTestBudget(pool, companyA.companyId, {
      converted_vehicle_id: vehicleEstado.id,
      status: 'anulado',
      itemNames: ['Trabajo que se anuló'],
    });
    // Otra orden de la MISMA empresa: sirve para verificar que el token de una orden no
    // autoriza a aprobar partidas de otra (RLS no ayuda acá, las dos son de companyA).
    vehicleOtraOrden = await createTestVehicle(pool, companyA.companyId);
    budgetOtraOrden = await createTestBudget(pool, companyA.companyId, {
      converted_vehicle_id: vehicleOtraOrden.id,
      status: 'convertido',
    });
    // Entregado hace 10 días con una ventana de 1 día: el trigger deja el token vencido.
    vehicleVencido = await createTestVehicle(pool, companyA.companyId, {
      fecha_salida_confirmada: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      public_token_expiry_days: 1,
    });

    companySuspendible = await createTestCompany(pool, `Test Susp ${Date.now()}`);
  });

  after(async () => {
    await cleanupTestCompany(pool, companyA.companyId);
    await cleanupTestCompany(pool, companyB.companyId);
    await cleanupTestCompany(pool, companySuspendible.companyId);
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

  // ---------------------------------------------------------------------------
  // Portal de clientes, Fase 2: pagina publica de estado.
  // ---------------------------------------------------------------------------

  test('GET /public/estado/:token trae la orden, su presupuesto y el taller', async () => {
    const res = await fetch(`${baseUrl}/public/estado/${vehicleEstado.public_token}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.vehicle.patente, vehicleEstado.patente);
    assert.equal(body.vehicle.estado, 'Ingresado');
    assert.ok(Array.isArray(body.photos), 'photos debe venir siempre, aunque este vacio');
    assert.ok(body.workshop?.name, 'el cliente tiene que poder ver de que taller es la pagina');

    const convertido = body.budgets.find((budget) => budget.id === budgetEstado.id);
    assert.ok(convertido, 'el presupuesto vinculado a la orden debe aparecer');
    assert.equal(convertido.items.length, 2);
    assert.equal(
      convertido.items.every((item) => item.approval_status === 'pendiente'),
      true,
    );
  });

  test('GET /public/estado/:token no expone ningun dato interno del taller', async () => {
    const res = await fetch(`${baseUrl}/public/estado/${vehicleEstado.public_token}`);
    const raw = await res.text();
    // Se revisa el JSON crudo, no campo por campo: asi el test tambien falla si manana alguien
    // agrega una columna interna a cualquiera de las queries de este endpoint.
    for (const campoInterno of [
      'comentario_tecnico',
      'observaciones',
      'customer_advance',
      'customer_rut',
      'customer_phone',
      'customer_address',
      'assigned_mechanic',
      'password',
      'cost',
    ]) {
      assert.equal(
        raw.includes(campoInterno),
        false,
        `la respuesta publica no debe incluir "${campoInterno}"`,
      );
    }
  });

  test('GET /public/estado/:token oculta los presupuestos anulados', async () => {
    const res = await fetch(`${baseUrl}/public/estado/${vehicleEstado.public_token}`);
    const body = await res.json();
    assert.equal(
      body.budgets.some((budget) => budget.id === budgetAnulado.id),
      false,
      'un presupuesto anulado mostraria botones de aprobar que el POST despues rechaza',
    );
  });

  test('GET /public/estado/:token con token vencido responde igual que uno inexistente', async () => {
    const vencido = await fetch(`${baseUrl}/public/estado/${vehicleVencido.public_token}`);
    const inexistente = await fetch(
      `${baseUrl}/public/estado/00000000-0000-4000-8000-000000000000`,
    );
    assert.equal(vencido.status, 404);
    assert.equal(inexistente.status, 404);
    // Mismo cuerpo ademas del mismo codigo: un token vencido no debe ser distinguible de uno
    // que nunca existio.
    assert.deepEqual(await vencido.json(), await inexistente.json());
  });

  // ---------------------------------------------------------------------------
  // Portal de clientes, Fase 3: aprobacion de partidas individuales.
  // ---------------------------------------------------------------------------

  const respondItem = (token, itemId, approved) =>
    fetch(`${baseUrl}/public/estado/${token}/items/${itemId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });

  test('POST .../items/:itemId/respond aprueba una partida y deja la otra pendiente', async () => {
    const [primera, segunda] = budgetEstado.items;
    const res = await respondItem(vehicleEstado.public_token, primera.id, true);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.approval_status, 'aprobado');
    assert.ok(body.approval_decided_at);

    const estado = await (
      await fetch(`${baseUrl}/public/estado/${vehicleEstado.public_token}`)
    ).json();
    const items = estado.budgets.find((budget) => budget.id === budgetEstado.id).items;
    assert.equal(items.find((item) => item.id === primera.id).approval_status, 'aprobado');
    assert.equal(
      items.find((item) => item.id === segunda.id).approval_status,
      'pendiente',
      'aprobar una partida no debe arrastrar a las demas',
    );
  });

  test('POST .../items/:itemId/respond deja registro en la auditoria', async () => {
    const [primera] = budgetEstado.items;
    const client = await pool.connect();
    try {
      await client.query('select set_config($1, $2, false)', [
        'app.current_company_id',
        companyA.companyId,
      ]);
      const { rows } = await client.query(
        `select action, actor, ip from budget_quote_item_approvals
         where budget_quote_item_id = $1`,
        [primera.id],
      );
      assert.equal(rows.length, 1, 'la decision del cliente tiene que quedar registrada');
      assert.equal(rows[0].action, 'aprobado');
      assert.equal(rows[0].actor, 'cliente');
      assert.ok(rows[0].ip, 'se registra desde donde respondio el cliente');
    } finally {
      client.release();
    }
  });

  test('POST .../items/:itemId/respond una segunda vez devuelve 409 y no pisa la primera', async () => {
    const [primera] = budgetEstado.items;
    const res = await respondItem(vehicleEstado.public_token, primera.id, false);
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'already_responded');
    assert.equal(body.status, 'aprobado', 'la decision original no debe cambiar');
  });

  test('el token de una orden no autoriza a aprobar partidas de otra orden', async () => {
    // Las dos ordenes son de la MISMA empresa, asi que RLS no interviene: lo unico que lo
    // impide es el chequeo de converted_vehicle_id del endpoint.
    const ajena = budgetOtraOrden.items[0];
    const res = await respondItem(vehicleEstado.public_token, ajena.id, true);
    assert.equal(res.status, 404);

    const client = await pool.connect();
    try {
      await client.query('select set_config($1, $2, false)', [
        'app.current_company_id',
        companyA.companyId,
      ]);
      const { rows } = await client.query(
        'select approval_status from budget_quote_items where id = $1',
        [ajena.id],
      );
      assert.equal(rows[0].approval_status, 'pendiente', 'la partida ajena no debe tocarse');
    } finally {
      client.release();
    }
  });

  test('no se puede aprobar una partida con un token vencido', async () => {
    const [, segunda] = budgetEstado.items;
    const res = await respondItem(vehicleVencido.public_token, segunda.id, true);
    assert.equal(res.status, 404);
  });

  test('la base rechaza modificar una partida ya aprobada sin reiniciar la aprobacion', async () => {
    // Guardrail de 20260916020000, independiente del codigo de la app: se verifica atacandolo
    // directo con SQL, que es el escenario para el que existe.
    const [primera] = budgetEstado.items;
    const client = await pool.connect();
    try {
      await client.query('select set_config($1, $2, false)', [
        'app.current_company_id',
        companyA.companyId,
      ]);
      await assert.rejects(
        () =>
          client.query('update budget_quote_items set unit_price = 1 where id = $1', [
            primera.id,
          ]),
        /ya aprobada por el cliente/,
      );
    } finally {
      client.release();
    }
  });

  // ---------------------------------------------------------------------------
  // Portal de clientes, Fase 4: recuperacion de acceso.
  // ---------------------------------------------------------------------------

  test('POST /public/recover-access responde lo mismo con y sin coincidencia', async () => {
    const recover = (body) =>
      fetch(`${baseUrl}/public/recover-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    // El vehiculo de prueba se crea con RUT 11.111.111-1, asi que "1111" coincide.
    const conCoincidencia = await recover({
      patente: vehicleEstado.patente,
      rut_prefix: '1111',
    });
    const sinCoincidencia = await recover({ patente: 'ZZ-9999', rut_prefix: '9999' });
    const rutIncorrecto = await recover({ patente: vehicleEstado.patente, rut_prefix: '8888' });

    assert.equal(conCoincidencia.status, 200);
    assert.equal(sinCoincidencia.status, 200);
    assert.equal(rutIncorrecto.status, 200);
    const [a, b, c] = await Promise.all([
      conCoincidencia.json(),
      sinCoincidencia.json(),
      rutIncorrecto.json(),
    ]);
    assert.deepEqual(a, b, 'el mensaje no debe revelar si hubo coincidencia');
    assert.deepEqual(a, c, 'el mensaje no debe revelar si el RUT era el correcto');
    // Y nunca devuelve el link ni el token en el cuerpo.
    assert.equal(JSON.stringify(a).includes(vehicleEstado.public_token), false);
  });

  // ---------------------------------------------------------------------------
  // Suspension por estado de suscripcion.
  // ---------------------------------------------------------------------------

  test('una empresa suspendida puede seguir leyendo pero no escribir', async () => {
    const session = await sessionFor(
      companySuspendible.adminEmail,
      companySuspendible.adminPassword,
    );
    const nuevoVehiculo = () =>
      authedFetch(session, '/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Cliente suspension',
          customer_rut: '11.111.111-1',
          customer_phone: '+56911111111',
          customer_address: 'Calle 1',
          customer_city: 'Santiago',
          patente: `SU-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          marca: 'Toyota',
          modelo: 'Yaris',
          ano: 2021,
          tipo_vehiculo: 'Auto',
          estado: 'Ingresado',
        }),
      });

    // Activa: escribe sin problema.
    assert.equal((await nuevoVehiculo()).status, 201);

    await setSubscriptionStatus(pool, companySuspendible.companyId, 'suspendida');

    const bloqueado = await nuevoVehiculo();
    assert.equal(bloqueado.status, 402);
    const body = await bloqueado.json();
    assert.equal(body.error, 'subscription_inactive');
    assert.equal(body.subscription_status, 'suspendida');

    // Pero la lectura sigue disponible: no se le retienen al taller sus propios datos.
    const lectura = await authedFetch(session, '/vehicles');
    assert.equal(lectura.status, 200);
    assert.ok(Array.isArray(await lectura.json()));

    await setSubscriptionStatus(pool, companySuspendible.companyId, 'activa');
    assert.equal((await nuevoVehiculo()).status, 201, 'al reactivar vuelve a poder escribir');
  });

  test('la suspension de una empresa no afecta a las demas', async () => {
    await setSubscriptionStatus(pool, companySuspendible.companyId, 'suspendida');
    try {
      const sessionA = await sessionFor(companyA.adminEmail, companyA.adminPassword);
      const res = await authedFetch(sessionA, '/service-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Categoria ${Date.now()}` }),
      });
      assert.equal(res.status, 201);
    } finally {
      await setSubscriptionStatus(pool, companySuspendible.companyId, 'activa');
    }
  });
}
