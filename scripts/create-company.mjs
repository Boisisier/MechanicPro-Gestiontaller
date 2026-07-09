#!/usr/bin/env node
// Da de alta una empresa (taller) nueva: crea la fila en companies, siembra los 3 roles por
// defecto y crea el primer usuario (Administrador de Taller) para que el cliente pueda entrar.
// Hoy no hay registro público (todavía no existe la landing de autoservicio/pago), así que
// mientras tanto esta es la forma de dar de alta un cliente nuevo: correr este script a mano
// contra DATABASE_URL (misma variable que usa el servidor).
//
// Uso:
//   node scripts/create-company.mjs "Nombre del taller" "Nombre del admin" "12.345.678-9" "admin@taller.cl" "ClaveSegura123"
//
// Requiere DATABASE_URL (y JWT_SECRET, aunque no se usa acá, porque server/index.js lo exige al
// cargar la configuración) en el .env del proyecto o en el entorno.

import { isValidRut, formatRut } from '../server/lib/core.js';

const [, , companyName, adminName, adminRut, adminEmail, adminPassword] = process.argv;

if (!companyName || !adminName || !adminRut || !adminEmail || !adminPassword) {
  console.error(
    'Uso: node scripts/create-company.mjs "Nombre del taller" "Nombre del admin" "RUT" "email@dominio.cl" "Contraseña"',
  );
  process.exit(1);
}

if (!isValidRut(adminRut)) {
  console.error(`RUT inválido: ${adminRut}`);
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizedEmail = adminEmail.trim().toLowerCase();
if (!emailRegex.test(normalizedEmail)) {
  console.error(`Email inválido: ${adminEmail}`);
  process.exit(1);
}

if (adminPassword.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const { pool, hashPassword, seedDefaultRoles } = await import('../server/index.js');

const client = await pool.connect();
try {
  await client.query('begin');

  const { rows: companyRows } = await client.query(
    'insert into companies (name) values ($1) returning id, name',
    [companyName.trim()],
  );
  const company = companyRows[0];

  // Fila recién creada: hay que fijar el contexto de tenant explícitamente en este cliente
  // para que las inserciones siguientes (roles, workshop_users) pasen las policies de RLS.
  await client.query('select set_config($1, $2, false)', [
    'app.current_company_id',
    company.id,
  ]);

  await seedDefaultRoles(client, company.id);

  const { rows: roleRows } = await client.query(
    `select id from roles where company_id = $1 and name = 'Administrador de Taller'`,
    [company.id],
  );

  const { rows: userRows } = await client.query(
    `insert into workshop_users (company_id, name, rut, email, password_hash, role_id, role_name)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, name, email`,
    [
      company.id,
      adminName.trim(),
      formatRut(adminRut),
      normalizedEmail,
      hashPassword(adminPassword),
      roleRows[0].id,
      'Administrador de Taller',
    ],
  );
  const admin = userRows[0];

  await client.query('commit');

  console.log('Empresa creada correctamente.\n');
  console.log(`  Empresa:   ${company.name} (${company.id})`);
  console.log(`  Admin:     ${admin.name} <${admin.email}>`);
  console.log(`  Contraseña: la que pasaste por línea de comando (no queda guardada en ningún log).`);
  console.log('\nYa puede iniciar sesión en la app con ese email y contraseña.');
} catch (error) {
  await client.query('rollback');
  if (error.code === '23505') {
    console.error(
      error.constraint === 'companies_name_key'
        ? `Ya existe una empresa con el nombre "${companyName}".`
        : `Ya existe un usuario con el email "${normalizedEmail}".`,
    );
  } else {
    console.error('Falló la creación de la empresa:', error.message);
  }
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
