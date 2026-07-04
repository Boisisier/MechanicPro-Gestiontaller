import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
});

const repuestos = [
  ["REP-DEMO-001", "Filtro habitaculo carbon activo", "Filtros", "7805000000011", 25, 5, "unidad", "Bodega Demo / R1", 7800, 14900],
  ["REP-DEMO-002", "Kit distribucion motor", "Motor", "7805000000028", 5, 1, "kit", "Bodega Demo / R2", 69000, 129000],
  ["REP-DEMO-003", "Tensor correa accesorios", "Motor", "7805000000035", 9, 2, "unidad", "Bodega Demo / R3", 18500, 38900],
  ["REP-DEMO-004", "Fuelle homocinetica", "Ejes", "7805000000042", 18, 4, "unidad", "Bodega Demo / R4", 8200, 16900],
  ["REP-DEMO-005", "Rodamiento rueda delantera", "Ejes", "7805000000059", 7, 2, "unidad", "Bodega Demo / R5", 26500, 54900],
  ["REP-DEMO-006", "Sensor temperatura refrigerante", "Sensores", "7805000000066", 10, 3, "unidad", "Bodega Demo / R6", 14500, 29900],
  ["REP-DEMO-007", "Manguera superior radiador", "Refrigeracion", "7805000000073", 11, 3, "unidad", "Bodega Demo / R7", 9800, 21900],
  ["REP-DEMO-008", "Alternador reconstruido", "Electricidad", "7805000000080", 3, 1, "unidad", "Bodega Demo / R8", 78000, 145000],
  ["REP-DEMO-009", "Motor partida reconstruido", "Electricidad", "7805000000097", 4, 1, "unidad", "Bodega Demo / R9", 72000, 139000],
  ["REP-DEMO-010", "Par plumillas limpiaparabrisas", "Carroceria", "7805000000103", 20, 6, "par", "Bodega Demo / R10", 6200, 13900],
];

const insumos = [
  ["INS-DEMO-001", "Shampoo automotriz concentrado", "Limpieza", "7806000000018", 40, 10, "litro", "Insumos Demo / E1", 1800, 3900],
  ["INS-DEMO-002", "Cera protectora liquida", "Limpieza", "7806000000025", 18, 5, "unidad", "Insumos Demo / E2", 4200, 8900],
  ["INS-DEMO-003", "Lubricante penetrante aerosol", "Lubricantes", "7806000000032", 28, 8, "unidad", "Insumos Demo / E3", 2700, 5900],
  ["INS-DEMO-004", "Anticongelante concentrado", "Refrigerantes", "7806000000049", 35, 10, "litro", "Insumos Demo / E4", 3300, 6900],
  ["INS-DEMO-005", "Aditivo estabilizador combustible", "Aditivos", "7806000000056", 22, 6, "unidad", "Insumos Demo / E5", 4500, 9500],
  ["INS-DEMO-006", "Limpiador tapiz interior", "Limpieza", "7806000000063", 16, 4, "unidad", "Insumos Demo / E6", 3900, 7900],
  ["INS-DEMO-007", "Paño microfibra profesional", "Limpieza", "7806000000070", 60, 15, "unidad", "Insumos Demo / E7", 900, 2500],
  ["INS-DEMO-008", "Protector bornes bateria", "Electricidad", "7806000000087", 20, 5, "unidad", "Insumos Demo / E8", 2500, 5500],
  ["INS-DEMO-009", "Aerosol pintura negra alta temperatura", "Carroceria", "7806000000094", 12, 3, "unidad", "Insumos Demo / E9", 5200, 10900],
  ["INS-DEMO-010", "Absorbente derrames taller", "Seguridad", "7806000000100", 10, 3, "saco", "Insumos Demo / E10", 6900, 13900],
];

const upsert = async (client, companyId, itemType, item) => {
  const [sku, name, category, barcode, stock, minStock, unit, location, cost, salePrice] = item;
  const existing = (
    await client.query("select id from inventory_items where company_id=$1 and sku=$2 limit 1", [
      companyId,
      sku,
    ])
  ).rows[0];
  if (existing) {
    await client.query(
      `update inventory_items
       set item_type=$1, name=$2, category=$3, barcode=$4, stock=$5, min_stock=$6,
           unit=$7, location=$8, cost=$9, sale_price=$10, status='activo',
           warehouse=$8, notes='Dato demo para presentacion', updated_at=now()
       where id=$11 and company_id=$12`,
      [itemType, name, category, barcode, stock, minStock, unit, location, cost, salePrice, existing.id, companyId],
    );
    return;
  }
  await client.query(
    `insert into inventory_items
      (company_id, item_type, name, category, sku, barcode, stock, min_stock, unit,
       location, supplier, cost, sale_price, status, warehouse, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Proveedor Demo',$11,$12,'activo',$10,'Dato demo para presentacion')`,
    [companyId, itemType, name, category, sku, barcode, stock, minStock, unit, location, cost, salePrice],
  );
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const company = (
      await client.query("select id, name from companies where name=$1 limit 1", [
        process.env.DEMO_COMPANY_NAME || "Taller Demo",
      ])
    ).rows[0];
    for (const item of repuestos) await upsert(client, company.id, "repuesto", item);
    for (const item of insumos) await upsert(client, company.id, "insumo", item);
    await client.query("commit");
    const counts = (
      await pool.query(
        `select
          count(*) filter (where item_type='repuesto') as repuestos,
          count(*) filter (where item_type='insumo') as insumos,
          count(*) as total
         from inventory_items where company_id=$1`,
        [company.id],
      )
    ).rows[0];
    console.log(JSON.stringify({ ok: true, company: company.name, ...counts }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
