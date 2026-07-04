import crypto from "crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no esta configurada");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
});

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const normalizePatente = (value) => {
  const clean = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
};

const serviceText = (name, price) => `${name} ($${price})`;
const partText = (item, quantity = 1) =>
  `[REPUESTO] ${[item.id, item.name, item.sku, quantity, item.unit, item.sale_price || item.cost || 0, item.location || "", item.item_type].join("|")}`;

const users = [
  ["Carolina Medina Castro", "15.876.543-2", "admin.operaciones@mechanicpro.cl", "AdminPro2026!", "Administrador de Taller"],
  ["Javiera Soto Navarro", "18.654.321-7", "administrativo3@mechanicpro.cl", "AdminiPro2026!", "Administrativo"],
  ["Cristian Lagos Paredes", "16.222.333-4", "administrativo4@mechanicpro.cl", "AdminiPro2026!", "Administrativo"],
  ["Mauricio Pena Rojas", "13.444.555-6", "mecanico4@mechanicpro.cl", "MecanicoPro2026!", "Mecánico"],
  ["Andres Valdes Mena", "17.555.666-8", "mecanico5@mechanicpro.cl", "MecanicoPro2026!", "Mecánico"],
  ["Sebastian Cortes Diaz", "19.111.222-3", "mecanico6@mechanicpro.cl", "MecanicoPro2026!", "Mecánico"],
];

const inventory = [
  ["repuesto", "Filtro de aire motor universal", "Filtros", "REP-FIL-AIR-011", "7803000000116", 16, 4, "unidad", "Bodega A / Rack 6 / Nivel 1", "Mahle", 7600, 15900, "Filtro de aire para vehiculos livianos."],
  ["repuesto", "Filtro de combustible bencina", "Filtros", "REP-FIL-COM-012", "7803000000123", 13, 3, "unidad", "Bodega A / Rack 6 / Nivel 2", "Mann Filter", 8900, 17900, "Filtro de combustible en linea."],
  ["repuesto", "Disco de freno ventilado", "Frenos", "REP-FRE-DIS-013", "7803000000130", 10, 2, "unidad", "Bodega C / Rack 4 / Nivel 1", "Brembo", 32000, 64900, "Disco delantero ventilado."],
  ["repuesto", "Balatas traseras", "Frenos", "REP-FRE-BAL-014", "7803000000147", 12, 3, "juego", "Bodega C / Rack 4 / Nivel 2", "Bosch", 18000, 35900, "Juego de balatas traseras."],
  ["repuesto", "Rotula de suspension", "Suspension", "REP-SUS-ROT-015", "7803000000154", 11, 3, "unidad", "Bodega C / Rack 5 / Nivel 1", "CTR", 12500, 27900, "Rotula inferior de suspension."],
  ["repuesto", "Buje de bandeja", "Suspension", "REP-SUS-BUJ-016", "7803000000161", 20, 6, "unidad", "Bodega C / Rack 5 / Nivel 2", "Febest", 6500, 13900, "Buje elastico para bandeja."],
  ["repuesto", "Bomba de agua", "Refrigeracion", "REP-REF-BOM-017", "7803000000178", 6, 2, "unidad", "Bodega B / Rack 4 / Nivel 1", "GMB", 38500, 78900, "Bomba de agua para motores compactos."],
  ["repuesto", "Termostato motor", "Refrigeracion", "REP-REF-TER-018", "7803000000185", 9, 2, "unidad", "Bodega B / Rack 4 / Nivel 2", "Vernet", 10800, 23900, "Termostato 82 grados."],
  ["repuesto", "Bobina de encendido", "Electricidad", "REP-ELE-BOB-019", "7803000000192", 8, 2, "unidad", "Bodega A / Rack 7 / Nivel 1", "Delphi", 26000, 54900, "Bobina individual de encendido."],
  ["repuesto", "Ampolleta H7", "Electricidad", "REP-ELE-H7-020", "7803000000208", 30, 10, "unidad", "Bodega A / Rack 7 / Nivel 2", "Osram", 3600, 7900, "Ampolleta halogena H7."],
  ["insumo", "Aceite motor 10W40 semisintetico", "Aceites", "INS-ACE-10W40-011", "7804000000113", 70, 18, "litro", "Insumos / Estante 7", "Shell", 4300, 7900, "Aceite semisintetico para alto kilometraje."],
  ["insumo", "Aceite diferencial 80W90", "Aceites", "INS-ACE-80W90-012", "7804000000120", 38, 10, "litro", "Insumos / Estante 7", "Castrol", 5600, 9900, "Aceite para diferencial y transmision mecanica."],
  ["insumo", "Agua desmineralizada", "Refrigerantes", "INS-REF-AGU-013", "7804000000137", 90, 20, "litro", "Insumos / Estante 8", "Quimica Pro", 900, 1900, "Agua desmineralizada para baterias y refrigeracion."],
  ["insumo", "Limpiador cuerpo aceleracion", "Limpieza tecnica", "INS-LIM-ACE-014", "7804000000144", 25, 8, "unidad", "Insumos / Estante 9", "Wurth", 4200, 8900, "Aerosol para limpieza de admision."],
  ["insumo", "Pasta anti-ruido frenos", "Frenos", "INS-FRE-PAS-015", "7804000000151", 18, 5, "unidad", "Insumos / Estante 9", "Liqui Moly", 3600, 7900, "Pasta para respaldo de pastillas."],
  ["insumo", "Sellador de roscas", "Sellantes", "INS-SEL-ROS-016", "7804000000168", 15, 4, "unidad", "Insumos / Estante 10", "Loctite", 5900, 11900, "Fijador anaerobico de roscas."],
  ["insumo", "Spray contacto electrico", "Electricidad", "INS-ELE-CON-017", "7804000000175", 24, 7, "unidad", "Insumos / Estante 10", "CRC", 3900, 8500, "Limpia contactos no conductor."],
  ["insumo", "Aditivo refrigerante", "Aditivos", "INS-ADI-REF-018", "7804000000182", 26, 7, "unidad", "Insumos / Estante 11", "Prestone", 4800, 9900, "Aditivo protector de sistema refrigerante."],
  ["insumo", "Toalla industrial rollo", "Limpieza tecnica", "INS-LIM-TOA-019", "7804000000199", 14, 4, "rollo", "Insumos / Estante 12", "Kimberly", 8200, 15900, "Rollo de papel industrial absorbente."],
  ["insumo", "Mascarillas taller caja", "Seguridad", "INS-SEG-MAS-020", "7804000000205", 16, 5, "caja", "Insumos / Estante 13", "3M", 7200, 13900, "Caja mascarillas desechables."],
];

const vehicles = [
  {
    patente: "NVRL-63",
    marca: "Suzuki",
    modelo: "Swift",
    ano: 2017,
    color: "Azul",
    km: 94400,
    fuel: 48,
    customer: ["Francisco Olivares Rios", "14.234.987-1", "+56971234567", "Los Aromos 455", "Rancagua", "francisco.olivares@example.com"],
    mechanicEmail: "mecanico4@mechanicpro.cl",
    advance: 45000,
    priority: "Alta",
    hours: 4,
    services: [["Cambio de filtro de aire", 26000], ["Limpieza cuerpo de aceleracion", 32000], ["Cambio aceite 10W40", 52000]],
    parts: [["REP-FIL-AIR-011", 1], ["INS-LIM-ACE-014", 1], ["INS-ACE-10W40-011", 4]],
  },
  {
    patente: "QWPL-79",
    marca: "Nissan",
    modelo: "Versa",
    ano: 2019,
    color: "Plata",
    km: 70600,
    fuel: 62,
    customer: ["Mariana Godoy Perez", "17.654.890-5", "+56972345678", "Bilbao 1902", "Santiago", "mariana.godoy@example.com"],
    mechanicEmail: "mecanico5@mechanicpro.cl",
    advance: 90000,
    priority: "Urgente",
    hours: 7,
    services: [["Cambio discos delanteros", 68000], ["Cambio balatas traseras", 48000], ["Mantencion sistema de frenos", 42000]],
    parts: [["REP-FRE-DIS-013", 2], ["REP-FRE-BAL-014", 1], ["INS-FRE-PAS-015", 1]],
  },
  {
    patente: "TBRC-18",
    marca: "Chery",
    modelo: "Tiggo 2",
    ano: 2021,
    color: "Negro",
    km: 52100,
    fuel: 38,
    customer: ["Luis Rebolledo Campos", "12.876.555-9", "+56973456789", "Av. Alemania 301", "Temuco", "luis.rebolledo@example.com"],
    mechanicEmail: "mecanico6@mechanicpro.cl",
    advance: 70000,
    priority: "Normal",
    hours: 6,
    services: [["Diagnostico sobrecalentamiento", 35000], ["Cambio bomba de agua", 85000], ["Cambio termostato", 45000]],
    parts: [["REP-REF-BOM-017", 1], ["REP-REF-TER-018", 1], ["INS-ADI-REF-018", 1]],
  },
];

const budgets = [
  ["Lorena Tapia Mendez", "16.111.222-5", "+56981112222", "lorena.tapia@example.com", "Colon 144", "Antofagasta", "ZKPT-54", "Toyota Yaris 2014", "Mantencion general y filtros.", 3, "enviado", [["Mantencion general", 89000, 1], ["Filtro de aire motor universal", 15900, 1], ["Aceite motor 10W40 semisintetico", 7900, 4]]],
  ["Pedro Alvarez Soto", "13.222.333-6", "+56982223333", "pedro.alvarez@example.com", "Freire 820", "Concepcion", "WJKS-36", "Hyundai Accent 2016", "Sistema de frenos completo.", 0, "aprobado", [["Cambio discos delanteros", 68000, 1], ["Disco de freno ventilado", 64900, 2], ["Pasta anti-ruido frenos", 7900, 1]]],
  ["Natalia Figueroa Leon", "18.333.444-7", "+56983334444", "natalia.figueroa@example.com", "Argentina 601", "Valparaiso", "PRMN-82", "Chevrolet Onix 2020", "Diagnostico electrico por falla de encendido.", 5, "borrador", [["Diagnostico electrico", 39000, 1], ["Bobina de encendido", 54900, 2], ["Spray contacto electrico", 8500, 1]]],
  ["Oscar Benitez Fuentes", "15.444.555-8", "+56984445555", "oscar.benitez@example.com", "Las Heras 55", "Talca", "DCLS-47", "Kia Morning 2015", "Reparacion sistema de refrigeracion.", 4, "enviado", [["Diagnostico sobrecalentamiento", 35000, 1], ["Bomba de agua", 78900, 1], ["Termostato motor", 23900, 1], ["Agua desmineralizada", 1900, 5]]],
  ["Patricia Reyes Aguilera", "19.555.666-9", "+56985556666", "patricia.reyes@example.com", "Portales 778", "La Serena", "FTGH-12", "MG 3 2022", "Revision suspension delantera.", 0, "aprobado", [["Revision tren delantero", 30000, 1], ["Rotula de suspension", 27900, 2], ["Buje de bandeja", 13900, 2]]],
];

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const companyName = process.env.DEMO_COMPANY_NAME || "Taller Demo";
    let company = (await client.query(
      "select id, name from companies where name = $1 order by created_at asc limit 1",
      [companyName],
    )).rows[0];
    if (!company) {
      company = (await client.query(
        "insert into companies (name) values ($1) returning id, name",
        [companyName],
      )).rows[0];
    }

    const roles = [
      ["Administrador de Taller", ["Dashboard", "Vehículos", "Presupuesto", "Inventario", "Estacionamiento", "Reportes", "Configuración", "Registro de acciones"]],
      ["Administrativo", ["Dashboard", "Vehículos", "Presupuesto", "Estacionamiento", "Reportes"]],
      ["Mecánico", ["Vehículos", "Reportes"]],
    ];
    const roleIds = new Map();
    for (const [name, modules] of roles) {
      const row = (await client.query(
        `insert into roles (company_id, name, modules)
         values ($1,$2,$3)
         on conflict (company_id, name) do update set modules = excluded.modules, updated_at = now()
         returning id`,
        [company.id, name, modules],
      )).rows[0];
      roleIds.set(name, row.id);
    }

    const workshopUsers = new Map();
    for (const [name, rut, email, password, role] of users) {
      const row = (await client.query(
        `insert into workshop_users (company_id, name, rut, email, password_hash, role_id, role_name, active)
         values ($1,$2,$3,$4,$5,$6,$7,true)
         on conflict (company_id, email)
         do update set name=excluded.name, rut=excluded.rut, password_hash=excluded.password_hash,
                       role_id=excluded.role_id, role_name=excluded.role_name, active=true, updated_at=now()
         returning id, name, email, role_name`,
        [company.id, name, rut, email, hashPassword(password), roleIds.get(role), role],
      )).rows[0];
      workshopUsers.set(email, row);
    }

    const inventoryBySku = new Map();
    for (const item of inventory) {
      const [item_type, name, category, sku, barcode, stock, min_stock, unit, location, supplier, cost, sale_price, notes] = item;
      const existing = (await client.query(
        "select id from inventory_items where company_id = $1 and sku = $2 limit 1",
        [company.id, sku],
      )).rows[0];
      const params = [
        company.id,
        item_type,
        name,
        category,
        sku,
        barcode,
        stock,
        min_stock,
        unit,
        location,
        supplier,
        cost,
        sale_price,
        notes,
      ];
      const row = existing
        ? (await client.query(
            `update inventory_items
             set item_type=$2, name=$3, category=$4, sku=$5, barcode=$6,
                 stock=$7, min_stock=$8, unit=$9, location=$10, supplier=$11,
                 cost=$12, sale_price=$13, status='activo', warehouse=$10,
                 notes=$14, updated_at=now()
             where company_id=$1 and id=$15
             returning *`,
            [...params, existing.id],
          )).rows[0]
        : (await client.query(
            `insert into inventory_items
              (company_id, item_type, name, category, sku, barcode, stock, min_stock, unit,
               location, supplier, cost, sale_price, status, warehouse, notes)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'activo',$10,$14)
             returning *`,
            params,
          )).rows[0];
      inventoryBySku.set(sku, row);
    }

    const category = (await client.query(
      `insert into service_categories (company_id, name)
       values ($1,'Servicios demo avanzados')
       on conflict (company_id, name) do update set active=true, updated_at=now()
       returning id`,
      [company.id],
    )).rows[0];
    const catalog = new Map();
    for (const [name, price] of vehicles.flatMap((vehicle) => vehicle.services)) {
      const code = `DEMO2-${name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 32)}`;
      const row = (await client.query(
        `insert into service_catalog (company_id, category_id, code, name, description, base_price, estimated_hours, active)
         values ($1,$2,$3,$4,$5,$6,1,true)
         on conflict (company_id, name)
         do update set base_price=excluded.base_price, active=true, updated_at=now()
         returning id, name, base_price, estimated_hours`,
        [company.id, category.id, code, name, `Servicio de demostracion: ${name}`, price],
      )).rows[0];
      catalog.set(name, row);
    }

    for (const vehicle of vehicles) {
      const mechanic = workshopUsers.get(vehicle.mechanicEmail);
      const promised = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const servicios = [
        ...vehicle.services.map(([name, price]) => serviceText(name, price)),
        ...vehicle.parts.map(([sku, quantity]) => partText(inventoryBySku.get(sku), quantity)),
      ];
      const [customer_name, customer_rut, customer_phone, customer_address, customer_city, customer_email] = vehicle.customer;
      const row = (await client.query(
        `insert into vehicles
          (company_id, customer_name, customer_rut, customer_phone, customer_address, customer_city,
           customer_email, assigned_mechanic_id, assigned_mechanic_name, customer_advance,
           attention_priority, estimated_work_hours, promised_delivery_date, customer_authorized,
           customer_authorized_at, patente, marca, modelo, ano, tipo_vehiculo, codigo_vin,
           codigo_motor, color, kilometraje, cantidad_combustible, estado, servicios,
           observaciones, comentario_tecnico, work_timer_started_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,now(),$14,$15,$16,$17,'Auto',$18,$19,$20,$21,$22,'En Taller',$23,$24,$25,now())
         on conflict do nothing
         returning id`,
        [
          company.id,
          customer_name,
          customer_rut,
          customer_phone,
          customer_address,
          customer_city,
          customer_email,
          mechanic?.id || null,
          mechanic?.name || "",
          vehicle.advance,
          vehicle.priority,
          vehicle.hours,
          promised,
          normalizePatente(vehicle.patente),
          vehicle.marca,
          vehicle.modelo,
          vehicle.ano,
          `VIN${normalizePatente(vehicle.patente).replace("-", "")}X`,
          `MOT${normalizePatente(vehicle.patente).replace("-", "")}X`,
          vehicle.color,
          vehicle.km,
          vehicle.fuel,
          servicios,
          "Ingreso de demostracion completo para revision del flujo en taller.",
          "Trabajo asignado con servicios, repuestos e insumos vinculados.",
        ],
      )).rows[0];
      const vehicleId = row?.id || (await client.query(
        "select id from vehicles where company_id=$1 and patente=$2 order by fecha_ingreso desc limit 1",
        [company.id, normalizePatente(vehicle.patente)],
      )).rows[0].id;
      await client.query("delete from vehicle_services where company_id=$1 and vehicle_id=$2", [company.id, vehicleId]);
      for (const [name, price] of vehicle.services) {
        await client.query(
          `insert into vehicle_services
            (company_id, vehicle_id, service_id, service_name_snapshot, unit_price_snapshot,
             estimated_hours_snapshot, quantity, status, added_by)
           values ($1,$2,$3,$4,$5,1,1,'En proceso',$6)`,
          [company.id, vehicleId, catalog.get(name)?.id || null, name, price, mechanic?.name || "Seed demo"],
        );
      }
    }

    for (const budget of budgets) {
      const [customer_name, customer_rut, customer_phone, customer_email, customer_address, customer_city, patente, vehicle, notes, discount, status, items] = budget;
      const subtotal = items.reduce((sum, [, price, qty]) => sum + price * qty, 0);
      const total = Math.round(subtotal * (1 - discount / 100) * 1.19);
      const quote = (await client.query(
        `insert into budget_quotes
          (company_id, customer_name, customer_rut, customer_phone, customer_email,
           customer_address, customer_city, patente, vehicle, notes, issue_date,
           expiry_date, discount_percent, tax_percent, advance_required,
           payment_method, terms, total, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,current_date,current_date + interval '10 days',$11,19,0,'Transferencia','Valores incluyen IVA.', $12,$13)
         on conflict do nothing
         returning id`,
        [company.id, customer_name, customer_rut, customer_phone, customer_email, customer_address, customer_city, patente, vehicle, notes, discount, total, status],
      )).rows[0];
      const quoteId = quote?.id || (await client.query(
        "select id from budget_quotes where company_id=$1 and patente=$2 and customer_rut=$3 order by created_at desc limit 1",
        [company.id, patente, customer_rut],
      )).rows[0].id;
      await client.query("delete from budget_quote_items where budget_quote_id=$1", [quoteId]);
      for (const [name, unitPrice, quantity] of items) {
        await client.query(
          `insert into budget_quote_items (budget_quote_id, item_type, name, quantity, unit_price, price, estimated_hours)
           values ($1,'servicio',$2,$3,$4,$4,0)`,
          [quoteId, name, quantity, unitPrice],
        );
      }
    }

    await client.query(
      `insert into audit_logs (company_id, user_name, module, action, detail)
       values ($1,'Seed demo extra','Sistema','Carga adicional de demostracion',
       '6 usuarios, 20 items de inventario, 3 vehiculos en taller y 5 presupuestos adicionales')`,
      [company.id],
    );
    await client.query("commit");
    console.log(JSON.stringify({ ok: true, company: company.name, users: 6, inventoryItems: 20, vehiclesInWorkshop: 3, budgets: 5 }, null, 2));
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
