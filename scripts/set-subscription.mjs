#!/usr/bin/env node
// Cambia el plan y/o el estado de suscripción de una empresa. Es la contraparte operativa de
// scripts/create-company.mjs: mientras no haya un proveedor de pagos conectado, suspender y
// reactivar a un taller se hace con este script.
//
// Una empresa suspendida (o cancelada) puede seguir ENTRANDO y LEYENDO lo suyo, pero no puede
// escribir nada — ver ensureWritable en server/index.js. Cortar también la lectura sería
// retenerle sus propios datos al taller.
//
// Uso:
//   node scripts/set-subscription.mjs "Nombre del taller" --estado suspendida
//   node scripts/set-subscription.mjs "Nombre del taller" --estado activa --plan taller_pro
//   node scripts/set-subscription.mjs --listar
//
// Requiere DATABASE_URL (y JWT_SECRET, porque server/index.js lo exige al cargar la
// configuración) en el .env del proyecto o en el entorno.

const ESTADOS = ['activa', 'suspendida', 'cancelada'];
const PLANES = ['taller', 'taller_pro', 'cadena'];

const args = process.argv.slice(2);
const listar = args.includes('--listar');

// Parseo en una sola pasada: las banderas con valor consumen el argumento siguiente, y lo que
// queda suelto es el nombre de la empresa (que puede tener espacios, así que va entre comillas).
const flags = {};
const posicionales = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--estado' || arg === '--plan') {
    flags[arg.slice(2)] = args[i + 1] || null;
    i += 1;
  } else if (!arg.startsWith('--')) {
    posicionales.push(arg);
  }
}

const companyName = posicionales[0] || null;
const estado = flags.estado;
const plan = flags.plan;

const uso = () => {
  console.error('Uso:');
  console.error('  node scripts/set-subscription.mjs "Nombre del taller" --estado suspendida');
  console.error('  node scripts/set-subscription.mjs "Nombre del taller" --estado activa --plan taller_pro');
  console.error('  node scripts/set-subscription.mjs --listar');
  console.error(`\n  --estado: ${ESTADOS.join(' | ')}`);
  console.error(`  --plan:   ${PLANES.join(' | ')}`);
};

if (!listar && !companyName) {
  uso();
  process.exit(1);
}

if (!listar && !estado && !plan) {
  console.error('Hay que indicar al menos --estado o --plan.\n');
  uso();
  process.exit(1);
}

if (estado && !ESTADOS.includes(estado)) {
  console.error(`Estado inválido: "${estado}". Válidos: ${ESTADOS.join(', ')}`);
  process.exit(1);
}

if (plan && !PLANES.includes(plan)) {
  console.error(`Plan inválido: "${plan}". Válidos: ${PLANES.join(', ')}`);
  process.exit(1);
}

const { pool, forgetSubscriptionStatus } = await import('../server/index.js');

try {
  if (listar) {
    // companies no tiene RLS, así que esta consulta ve todas las empresas sin necesidad de
    // fijar un contexto de tenant (ver supabase/migrations/20260707000000...).
    const { rows } = await pool.query(
      `select name, plan, subscription_status, subscription_suspended_at
       from companies order by name`,
    );
    if (rows.length === 0) {
      console.log('No hay empresas registradas.');
    } else {
      console.log('Empresas:\n');
      for (const row of rows) {
        const desde = row.subscription_suspended_at
          ? ` (desde ${new Date(row.subscription_suspended_at).toLocaleDateString('es-CL')})`
          : '';
        console.log(`  ${row.name.padEnd(30)} ${row.plan.padEnd(12)} ${row.subscription_status}${desde}`);
      }
    }
    process.exit(0);
  }

  const campos = [];
  const valores = [companyName.trim()];
  if (estado) {
    campos.push(`subscription_status = $${valores.length + 1}`);
    valores.push(estado);
    // El timestamp se deriva del estado en la misma sentencia, para que no puedan quedar
    // inconsistentes entre sí.
    campos.push(
      `subscription_suspended_at = case when $${valores.length} = 'activa' then null else now() end`,
    );
  }
  if (plan) {
    campos.push(`plan = $${valores.length + 1}`);
    valores.push(plan);
  }

  const { rows } = await pool.query(
    `update companies set ${campos.join(', ')}, updated_at = now()
     where name = $1
     returning id, name, plan, subscription_status`,
    valores,
  );

  if (rows.length === 0) {
    console.error(`No existe ninguna empresa con el nombre "${companyName}".`);
    console.error('Usá --listar para ver los nombres exactos.');
    process.exit(1);
  }

  const company = rows[0];
  // El servidor cachea el estado por 30 segundos. Este script corre en otro proceso, así que
  // esto no afecta al servidor en producción: allá el cambio tarda hasta 30s en hacerse
  // efectivo, que es el comportamiento esperado y está documentado en docs/produccion.md.
  forgetSubscriptionStatus(company.id);

  console.log('Suscripción actualizada.\n');
  console.log(`  Empresa: ${company.name} (${company.id})`);
  console.log(`  Plan:    ${company.plan}`);
  console.log(`  Estado:  ${company.subscription_status}`);
  if (company.subscription_status !== 'activa') {
    console.log('\n  El taller va a poder seguir entrando y consultando sus datos,');
    console.log('  pero no podrá guardar ni modificar nada (el servidor responde 402).');
    console.log('  Puede tardar hasta 30 segundos en hacerse efectivo.');
  }
} catch (error) {
  console.error('Falló la actualización:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
