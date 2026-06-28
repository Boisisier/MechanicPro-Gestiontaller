import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src/features/vehiculo/serviceCatalog.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const catalogBlock = source.slice(
  source.indexOf('export const serviceCatalogByCategory'),
  source.indexOf('export const serviceCatalog ='),
);

const groups = [...catalogBlock.matchAll(
  /category:\s*'([^']+)'[\s\S]*?services:\s*\[([\s\S]*?)\]/g,
)].map((match) => ({
  category: match[1],
  services: [...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1]),
}));

const categoryDefaults = {
  'Diagnóstico e inspección': [30000, 1],
  'Mantenimiento preventivo': [35000, 1],
  'Lubricación y fluidos': [40000, 1.25],
  Motor: [90000, 3],
  'Sistema de combustible e inyección': [70000, 2.5],
  'Refrigeración del motor': [65000, 2],
  'Transmisión y caja de cambios': [100000, 3.5],
  'Embrague': [130000, 4],
  Frenos: [65000, 2],
  'Dirección': [60000, 2],
  'Suspensión y tren delantero': [75000, 2.5],
  'Neumáticos y ruedas': [30000, 1],
  'Sistema eléctrico y electrónico': [55000, 2],
  'Climatización y calefacción': [60000, 2],
  'Escape y emisiones': [65000, 2],
  'Carrocería y accesorios': [45000, 1.5],
  'Cristales y visibilidad': [35000, 1],
  'Seguridad y asistencia': [50000, 1.5],
  'Servicios complementarios': [30000, 1],
};

const estimate = (name, category) => {
  let [price, hours] = categoryDefaults[category] || [40000, 1.5];
  const normalized = name.toLowerCase();

  if (/(diagnóstico|revisión|inspección|prueba|lectura|escaneo)/.test(normalized)) {
    price = Math.max(20000, Math.round(price * 0.7 / 5000) * 5000);
    hours = Math.max(0.5, hours * 0.65);
  }
  if (/(cambio|reemplazo|reparación|rectificado|desmontaje)/.test(normalized)) {
    price = Math.round(price * 1.25 / 5000) * 5000;
    hours *= 1.35;
  }
  if (/(motor completo|culata|caja automática|transmisión|embrague|distribución)/.test(normalized)) {
    price = Math.max(price, 150000);
    hours = Math.max(hours, 5);
  }
  if (/(limpieza|ajuste|regulación|calibración|programación|reseteo)/.test(normalized)) {
    price = Math.max(25000, Math.round(price * 0.8 / 5000) * 5000);
    hours = Math.max(0.75, hours * 0.8);
  }
  if (/(filtro|bujía|ampolleta|plumilla|fusible)/.test(normalized)) {
    price = Math.min(price, 30000);
    hours = Math.min(hours, 1);
  }

  return {
    price: Math.max(10000, Math.round(price / 5000) * 5000),
    hours: Math.max(0.25, Math.round(hours * 4) / 4),
  };
};

const rawEntries = groups.flatMap(({ category, services }) =>
  services.map((name) => ({ category, name, ...estimate(name, category) })),
);
const entries = Array.from(
  rawEntries.reduce((unique, entry) => {
    if (!unique.has(entry.name)) {
      unique.set(entry.name, entry);
    }
    return unique;
  }, new Map()).values(),
);

if (entries.length !== 240) {
  throw new Error(`Se esperaban 240 servicios y se encontraron ${entries.length}`);
}

const jsRows = entries.map(
  (item, index) =>
    `  ['SRV-${String(index + 1).padStart(3, '0')}', ${JSON.stringify(item.category)}, ${JSON.stringify(item.name)}, ${item.price}, ${item.hours}],`,
);
const jsOutput = `// Generado desde src/features/vehiculo/serviceCatalog.ts.\n` +
  `// Ejecutar: node scripts/generate-service-seed.mjs\n` +
  `export const completeServiceCatalog = [\n${jsRows.join('\n')}\n];\n`;
fs.writeFileSync(path.join(root, 'server/serviceCatalogSeed.js'), jsOutput);

const escapeSql = (value) => value.replaceAll("'", "''");
const sqlRows = entries.map(
  (item, index) =>
    `    ('SRV-${String(index + 1).padStart(3, '0')}', '${escapeSql(item.category)}', '${escapeSql(item.name)}', ${item.price}, ${item.hours})`,
);
const sqlOutput = `-- Generado desde src/features/vehiculo/serviceCatalog.ts.\n` +
`with catalog_seed(code, category_name, service_name, base_price, estimated_hours) as (\n` +
`  values\n${sqlRows.join(',\n')}\n` +
`), category_seed as (\n` +
`  insert into service_categories (company_id, name)\n` +
`  select c.id, seed.category_name\n` +
`  from companies c\n` +
`  cross join (select distinct category_name from catalog_seed) seed\n` +
`  on conflict (company_id, name) do update set active = true, updated_at = now()\n` +
`  returning id, company_id, name\n` +
`)\n` +
`insert into service_catalog (\n` +
`  company_id, category_id, code, name, description, base_price, estimated_hours, active\n` +
`)\n` +
`select c.id, sc.id, seed.code, seed.service_name, '', seed.base_price, seed.estimated_hours, true\n` +
`from companies c\n` +
`join catalog_seed seed on true\n` +
`join category_seed sc on sc.company_id = c.id and sc.name = seed.category_name\n` +
`on conflict (company_id, name) do update\n` +
`set category_id = excluded.category_id,\n` +
`    base_price = case when service_catalog.base_price = 0 then excluded.base_price else service_catalog.base_price end,\n` +
`    estimated_hours = case when service_catalog.estimated_hours = 0 then excluded.estimated_hours else service_catalog.estimated_hours end,\n` +
`    active = true,\n` +
`    updated_at = now();\n`;
fs.writeFileSync(
  path.join(root, 'supabase/migrations/20260627000000_seed_complete_service_catalog.sql'),
  sqlOutput,
);

console.log(`Generados ${entries.length} servicios en ${groups.length} categorías.`);
