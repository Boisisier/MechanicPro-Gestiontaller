import crypto from "crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no esta configurada");
}

const pool = new Pool({
  connectionString: databaseUrl,
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

const normalizePatente = (value = "") => {
  const normalized = String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (normalized.length <= 2) return normalized;
  if (/^[A-Z]{2}\d/.test(normalized)) return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

const serviceText = (name, price) => `${name} ($${price})`;

const partText = (item, quantity = 1) =>
  `[REPUESTO] ${[
    item.id,
    item.name,
    item.sku,
    quantity,
    item.unit,
    item.sale_price || item.cost || 0,
    item.location || item.warehouse || "",
    item.item_type,
  ].join("|")}`;

const users = [
  {
    name: "Marcela Rojas Castillo",
    rut: "15.432.987-6",
    email: "admin.revision@mechanicpro.cl",
    password: "AdminPro2026!",
    role: "Administrador de Taller",
  },
  {
    name: "Paula Fuentes Silva",
    rut: "17.987.456-2",
    email: "administrativo1@mechanicpro.cl",
    password: "AdminiPro2026!",
    role: "Administrativo",
  },
  {
    name: "Diego Morales Herrera",
    rut: "16.345.789-1",
    email: "administrativo2@mechanicpro.cl",
    password: "AdminiPro2026!",
    role: "Administrativo",
  },
  {
    name: "Gustavo Munoz Rivas",
    rut: "18.456.123-9",
    email: "mecanico1@mechanicpro.cl",
    password: "MecanicoPro2026!",
    role: "Mecánico",
  },
  {
    name: "Claudio Henriquez Vega",
    rut: "14.876.321-5",
    email: "mecanico2@mechanicpro.cl",
    password: "MecanicoPro2026!",
    role: "Mecánico",
  },
  {
    name: "Felipe Araya Soto",
    rut: "19.765.432-8",
    email: "mecanico3@mechanicpro.cl",
    password: "MecanicoPro2026!",
    role: "Mecánico",
  },
];

const inventoryItems = [
  ["repuesto", "Filtro de aceite Toyota/Rav4", "Filtros", "REP-FIL-ACE-001", "7801000000011", 18, 4, "unidad", "Bodega A / Rack 1 / Nivel 2", "Mann Filter", 6500, 12500, "Filtro spin-on para motores bencineros."],
  ["repuesto", "Pastillas de freno delanteras", "Frenos", "REP-FRE-PAS-002", "7801000000028", 12, 3, "juego", "Bodega A / Rack 2 / Nivel 1", "Bosch", 18500, 38900, "Juego de pastillas ceramicas delanteras."],
  ["repuesto", "Bateria 60Ah", "Electricidad", "REP-ELE-BAT-003", "7801000000035", 7, 2, "unidad", "Bodega B / Rack 1 / Piso", "Willard", 52000, 89900, "Bateria libre de mantencion 12V."],
  ["repuesto", "Bujias iridium", "Encendido", "REP-ENC-BUJ-004", "7801000000042", 24, 8, "unidad", "Bodega A / Rack 3 / Nivel 2", "NGK", 7200, 14900, "Bujia iridium para motores multipunto."],
  ["repuesto", "Correa de accesorios", "Motor", "REP-MOT-COR-005", "7801000000059", 10, 3, "unidad", "Bodega A / Rack 4 / Nivel 1", "Gates", 11500, 24500, "Correa serpentina multicanal."],
  ["repuesto", "Amortiguador delantero", "Suspension", "REP-SUS-AMO-006", "7801000000066", 8, 2, "unidad", "Bodega C / Rack 1 / Nivel 1", "KYB", 42000, 78900, "Amortiguador delantero presurizado."],
  ["repuesto", "Terminal de direccion", "Direccion", "REP-DIR-TER-007", "7801000000073", 14, 4, "unidad", "Bodega C / Rack 2 / Nivel 2", "CTR", 9600, 21900, "Terminal exterior de direccion."],
  ["repuesto", "Kit embrague compacto", "Transmision", "REP-TRA-EMB-008", "7801000000080", 4, 1, "kit", "Bodega B / Rack 3 / Nivel 1", "Exedy", 95000, 165000, "Kit prensa, disco y rodamiento."],
  ["repuesto", "Radiador aluminio", "Refrigeracion", "REP-REF-RAD-009", "7801000000097", 5, 1, "unidad", "Bodega C / Rack 3 / Nivel 1", "Denso", 68000, 125000, "Radiador para vehiculos medianos."],
  ["repuesto", "Sensor oxigeno universal", "Inyeccion", "REP-INY-SOX-010", "7801000000103", 9, 2, "unidad", "Bodega A / Rack 5 / Nivel 2", "Delphi", 34500, 69900, "Sensor lambda universal cuatro cables."],
  ["insumo", "Aceite motor 5W30 sintetico", "Aceites", "INS-ACE-5W30-001", "7802000000018", 80, 20, "litro", "Insumos / Estante 1", "Mobil", 5200, 8900, "Aceite sintetico API SP."],
  ["insumo", "Aceite caja ATF Dexron VI", "Aceites", "INS-ACE-ATF-002", "7802000000025", 45, 12, "litro", "Insumos / Estante 1", "ACDelco", 6400, 10900, "Fluido ATF para cajas automaticas."],
  ["insumo", "Refrigerante organico rojo", "Refrigerantes", "INS-REF-ORG-003", "7802000000032", 60, 15, "litro", "Insumos / Estante 2", "Prestone", 2800, 5900, "Refrigerante OAT listo para usar."],
  ["insumo", "Liquido de frenos DOT4", "Frenos", "INS-FRE-DOT4-004", "7802000000049", 32, 8, "unidad", "Insumos / Estante 2", "Bosch", 3900, 7900, "Envase 500 ml DOT4."],
  ["insumo", "Grasa multiproposito", "Lubricantes", "INS-LUB-GRA-005", "7802000000056", 20, 5, "unidad", "Insumos / Estante 3", "Luber", 4200, 8500, "Cartucho de grasa multiproposito."],
  ["insumo", "Limpiafrenos aerosol", "Limpieza tecnica", "INS-LIM-FRE-006", "7802000000063", 36, 10, "unidad", "Insumos / Estante 3", "Wurth", 3500, 6900, "Aerosol limpiafrenos 500 ml."],
  ["insumo", "Silicona alta temperatura", "Sellantes", "INS-SEL-SIL-007", "7802000000070", 22, 6, "unidad", "Insumos / Estante 4", "Loctite", 4900, 9900, "Sellador RTV alta temperatura."],
  ["insumo", "Desengrasante mecanico", "Limpieza tecnica", "INS-LIM-DES-008", "7802000000087", 50, 12, "litro", "Insumos / Estante 3", "3M", 2100, 4900, "Desengrasante concentrado biodegradable."],
  ["insumo", "Aditivo limpia inyectores", "Aditivos", "INS-ADI-INY-009", "7802000000094", 28, 8, "unidad", "Insumos / Estante 5", "Liqui Moly", 5200, 10900, "Aditivo para sistema de combustible."],
  ["insumo", "Guantes nitrilo caja", "Seguridad", "INS-SEG-GUA-010", "7802000000100", 18, 5, "caja", "Insumos / Estante 6", "Ansell", 6800, 12900, "Caja 100 unidades nitrilo."],
];

const vehicles = [
  {
    patente: "KTRP-84",
    marca: "Toyota",
    modelo: "Corolla",
    ano: 2018,
    color: "Blanco",
    kilometraje: 87500,
    cantidad_combustible: 55,
    customer_name: "Roberto Salinas Perez",
    customer_rut: "12.456.789-0",
    customer_phone: "+56981234567",
    customer_address: "Av. Las Condes 7420",
    customer_city: "Santiago",
    customer_email: "roberto.salinas@example.com",
    mechanicEmail: "mecanico1@mechanicpro.cl",
    advance: 50000,
    priority: "Alta",
    hours: 5,
    deliveryDays: 2,
    services: [
      ["Cambio de aceite de motor", 45000],
      ["Cambio de filtro de aceite", 12500],
      ["Revision sistema de frenos", 28000],
    ],
    parts: [
      ["REP-FIL-ACE-001", 1],
      ["INS-ACE-5W30-001", 4],
      ["INS-LIM-FRE-006", 1],
    ],
    observaciones: "Cliente solicita mantencion preventiva y revision de ruido al frenar.",
    comentario_tecnico: "Se detecta desgaste moderado de pastillas delanteras y aceite vencido.",
  },
  {
    patente: "LPSD-31",
    marca: "Hyundai",
    modelo: "Tucson",
    ano: 2020,
    color: "Gris grafito",
    kilometraje: 64200,
    cantidad_combustible: 40,
    customer_name: "Camila Torres Fuentes",
    customer_rut: "16.987.654-3",
    customer_phone: "+56987654321",
    customer_address: "Los Carrera 1550",
    customer_city: "Concepcion",
    customer_email: "camila.torres@example.com",
    mechanicEmail: "mecanico2@mechanicpro.cl",
    advance: 120000,
    priority: "Urgente",
    hours: 8,
    deliveryDays: 3,
    services: [
      ["Diagnostico scanner avanzado", 35000],
      ["Cambio de pastillas delanteras", 55000],
      ["Mantencion sistema de refrigeracion", 42000],
    ],
    parts: [
      ["REP-FRE-PAS-002", 1],
      ["INS-FRE-DOT4-004", 1],
      ["INS-REF-ORG-003", 5],
    ],
    observaciones: "Vehiculo llega con testigo de motor y vibracion al frenar.",
    comentario_tecnico: "Se agenda diagnostico electronico y prueba de ruta posterior.",
  },
  {
    patente: "MXVR-52",
    marca: "Chevrolet",
    modelo: "Sail",
    ano: 2016,
    color: "Rojo",
    kilometraje: 132400,
    cantidad_combustible: 35,
    customer_name: "Ignacio Vargas Soto",
    customer_rut: "13.789.456-1",
    customer_phone: "+56976543210",
    customer_address: "San Martin 884",
    customer_city: "Valparaiso",
    customer_email: "ignacio.vargas@example.com",
    mechanicEmail: "mecanico3@mechanicpro.cl",
    advance: 30000,
    priority: "Normal",
    hours: 6,
    deliveryDays: 4,
    services: [
      ["Cambio de bujias", 38000],
      ["Limpieza cuerpo de aceleracion", 32000],
      ["Revision linea de escape", 25000],
    ],
    parts: [
      ["REP-ENC-BUJ-004", 4],
      ["INS-ADI-INY-009", 1],
      ["INS-LIM-DES-008", 2],
    ],
    observaciones: "Cliente indica consumo elevado y ralenti irregular.",
    comentario_tecnico: "Se recomienda limpieza de admision y reemplazo de bujias.",
  },
];

const budgets = [
  {
    customer_name: "Daniela Pizarro Molina",
    customer_rut: "18.234.567-4",
    customer_phone: "+56922223333",
    customer_email: "daniela.pizarro@example.com",
    customer_address: "Pedro de Valdivia 2210",
    customer_city: "Santiago",
    patente: "HHJK-21",
    vehicle: "Kia Rio 2017",
    notes: "Presupuesto por mantencion de 90.000 km.",
    discount_percent: 5,
    tax_percent: 19,
    advance_required: 40000,
    payment_method: "Transferencia",
    terms: "Valido por 10 dias.",
    status: "enviado",
    items: [
      ["servicio", "Mantencion 90.000 km", 95000, 1, 3],
      ["repuesto", "Filtro de aceite Toyota/Rav4", 12500, 1, 0],
      ["insumo", "Aceite motor 5W30 sintetico", 8900, 4, 0],
    ],
  },
  {
    customer_name: "Hector Munoz Lara",
    customer_rut: "11.567.987-2",
    customer_phone: "+56933334444",
    customer_email: "hector.munoz@example.com",
    customer_address: "Brasil 431",
    customer_city: "La Serena",
    patente: "JHLD-90",
    vehicle: "Nissan Versa 2019",
    notes: "Cotizacion por frenos delanteros.",
    discount_percent: 0,
    tax_percent: 19,
    advance_required: 0,
    payment_method: "Debito",
    terms: "Incluye mano de obra y prueba de ruta.",
    status: "aprobado",
    items: [
      ["servicio", "Cambio de pastillas delanteras", 55000, 1, 2],
      ["repuesto", "Pastillas de freno delanteras", 38900, 1, 0],
      ["insumo", "Liquido de frenos DOT4", 7900, 1, 0],
    ],
  },
  {
    customer_name: "Sofia Contreras Vega",
    customer_rut: "20.123.456-7",
    customer_phone: "+56944445555",
    customer_email: "sofia.contreras@example.com",
    customer_address: "O'Higgins 772",
    customer_city: "Temuco",
    patente: "PKLR-18",
    vehicle: "MG ZS 2021",
    notes: "Revision por sobrecalentamiento.",
    discount_percent: 8,
    tax_percent: 19,
    advance_required: 60000,
    payment_method: "Credito",
    terms: "Sujeto a desmontaje y diagnostico.",
    status: "borrador",
    items: [
      ["servicio", "Diagnostico sistema de refrigeracion", 35000, 1, 1.5],
      ["repuesto", "Radiador aluminio", 125000, 1, 0],
      ["insumo", "Refrigerante organico rojo", 5900, 6, 0],
    ],
  },
  {
    customer_name: "Matias Aguilera Rios",
    customer_rut: "17.345.678-5",
    customer_phone: "+56955556666",
    customer_email: "matias.aguilera@example.com",
    customer_address: "Avenida Alemania 998",
    customer_city: "Valdivia",
    patente: "RVST-44",
    vehicle: "Suzuki Swift 2015",
    notes: "Cotizacion por embrague completo.",
    discount_percent: 3,
    tax_percent: 19,
    advance_required: 100000,
    payment_method: "Transferencia",
    terms: "No incluye rectificado de volante si fuese necesario.",
    status: "enviado",
    items: [
      ["servicio", "Cambio de kit de embrague", 150000, 1, 7],
      ["repuesto", "Kit embrague compacto", 165000, 1, 0],
      ["insumo", "Grasa multiproposito", 8500, 1, 0],
    ],
  },
  {
    customer_name: "Valentina Leiva Arce",
    customer_rut: "19.876.543-0",
    customer_phone: "+56966667777",
    customer_email: "valentina.leiva@example.com",
    customer_address: "Manuel Montt 120",
    customer_city: "Santiago",
    patente: "TRCN-27",
    vehicle: "Chery Tiggo 2 2022",
    notes: "Evaluacion de tren delantero y amortiguacion.",
    discount_percent: 0,
    tax_percent: 19,
    advance_required: 50000,
    payment_method: "Efectivo",
    terms: "Valores incluyen IVA.",
    status: "aprobado",
    items: [
      ["servicio", "Revision tren delantero", 30000, 1, 1],
      ["repuesto", "Amortiguador delantero", 78900, 2, 0],
      ["repuesto", "Terminal de direccion", 21900, 2, 0],
    ],
  },
];

const ensureCompany = async (client) => {
  const existing = await client.query("select id, name from companies order by created_at asc limit 1");
  if (existing.rows.length) return existing.rows[0];
  const created = await client.query(
    "insert into companies (name) values ($1) returning id, name",
    ["Mechanic Pro"],
  );
  return created.rows[0];
};

const ensureRoles = async (client, companyId) => {
  const roles = [
    ["Administrador de Taller", ["Dashboard", "Vehículos", "Presupuesto", "Inventario", "Estacionamiento", "Reportes", "Configuración", "Registro de acciones"]],
    ["Administrativo", ["Dashboard", "Vehículos", "Presupuesto", "Estacionamiento", "Reportes"]],
    ["Mecánico", ["Vehículos", "Reportes"]],
  ];
  for (const [name, modules] of roles) {
    await client.query(
      `insert into roles (company_id, name, modules)
       values ($1, $2, $3)
       on conflict (company_id, name)
       do update set modules = excluded.modules, updated_at = now()`,
      [companyId, name, modules],
    );
  }
  const { rows } = await client.query("select id, name from roles where company_id = $1", [companyId]);
  return new Map(rows.map((role) => [role.name, role.id]));
};

const upsertUsers = async (client, companyId, roleIds) => {
  const result = [];
  for (const user of users) {
    const { rows } = await client.query(
      `insert into workshop_users
        (company_id, name, rut, email, password_hash, role_id, role_name, active)
       values ($1,$2,$3,$4,$5,$6,$7,true)
       on conflict (company_id, email)
       do update set name = excluded.name,
                     rut = excluded.rut,
                     password_hash = excluded.password_hash,
                     role_id = excluded.role_id,
                     role_name = excluded.role_name,
                     active = true,
                     updated_at = now()
       returning id, name, email, role_name`,
      [
        companyId,
        user.name,
        user.rut,
        user.email.toLowerCase(),
        hashPassword(user.password),
        roleIds.get(user.role),
        user.role,
      ],
    );
    result.push(rows[0]);
  }
  return result;
};

const upsertInventory = async (client, companyId) => {
  const inserted = new Map();
  for (const [
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
  ] of inventoryItems) {
    const existing = await client.query(
      "select id, stock from inventory_items where company_id = $1 and sku = $2 limit 1",
      [companyId, sku],
    );
    let row;
    if (existing.rows.length) {
      const updated = await client.query(
        `update inventory_items
         set item_type=$1, name=$2, category=$3, barcode=$4, stock=$5, min_stock=$6,
             unit=$7, location=$8, supplier=$9, cost=$10, sale_price=$11,
             status='activo', warehouse=$12, notes=$13, updated_at=now()
         where id=$14 and company_id=$15
         returning *`,
        [item_type, name, category, barcode, stock, min_stock, unit, location, supplier, cost, sale_price, location, notes, existing.rows[0].id, companyId],
      );
      row = updated.rows[0];
    } else {
      const created = await client.query(
        `insert into inventory_items
          (company_id, item_type, name, category, sku, barcode, stock, min_stock, unit,
           location, supplier, cost, sale_price, status, warehouse, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'activo',$14,$15)
         returning *`,
        [companyId, item_type, name, category, sku, barcode, stock, min_stock, unit, location, supplier, cost, sale_price, location, notes],
      );
      row = created.rows[0];
      await client.query(
        `insert into inventory_movements
          (company_id, inventory_item_id, movement_type, quantity, stock_before, stock_after, reason, user_name)
         values ($1,$2,'inventario_inicial',$3,0,$3,'Datos de demostracion para revision','Seed demo')`,
        [companyId, row.id, stock],
      );
    }
    inserted.set(sku, row);
  }
  return inserted;
};

const ensureCatalogServices = async (client, companyId, serviceRows) => {
  const categoryName = "Demo revision";
  const categoryResult = await client.query(
    `insert into service_categories (company_id, name, active)
     values ($1, $2, true)
     on conflict (company_id, name)
     do update set active = true, updated_at = now()
     returning id`,
    [companyId, categoryName],
  );
  const categoryId = categoryResult.rows[0].id;
  const byName = new Map();
  for (const [name, price, hours = 1] of serviceRows) {
    const code = `DEMO-${name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 34)}`;
    const { rows } = await client.query(
      `insert into service_catalog
        (company_id, category_id, code, name, description, base_price, estimated_hours, active)
       values ($1,$2,$3,$4,$5,$6,$7,true)
       on conflict (company_id, name)
       do update set category_id=excluded.category_id,
                     base_price=excluded.base_price,
                     estimated_hours=excluded.estimated_hours,
                     active=true,
                     updated_at=now()
       returning id, name, base_price, estimated_hours`,
      [companyId, categoryId, code, name, `Servicio cargado para demostracion: ${name}`, price, hours],
    );
    byName.set(name, rows[0]);
  }
  return byName;
};

const upsertVehicles = async (client, companyId, workshopUsers, inventoryBySku, catalogByName) => {
  const mechanicsByEmail = new Map(workshopUsers.map((user) => [user.email, user]));
  const inserted = [];
  for (const vehicle of vehicles) {
    const mechanic = mechanicsByEmail.get(vehicle.mechanicEmail);
    const selectedParts = vehicle.parts.map(([sku, quantity]) => [inventoryBySku.get(sku), quantity]);
    const servicios = [
      ...vehicle.services.map(([name, price]) => serviceText(name, price)),
      ...selectedParts.map(([item, quantity]) => partText(item, quantity)),
    ];
    const promised = new Date();
    promised.setDate(promised.getDate() + vehicle.deliveryDays);

    const existing = await client.query(
      "select id from vehicles where company_id = $1 and patente = $2 order by fecha_ingreso desc limit 1",
      [companyId, normalizePatente(vehicle.patente)],
    );
    let row;
    const values = [
      vehicle.customer_name,
      vehicle.customer_rut,
      vehicle.customer_phone,
      vehicle.customer_address,
      vehicle.customer_city,
      vehicle.customer_email,
      mechanic?.id || null,
      mechanic?.name || "",
      vehicle.advance,
      vehicle.priority,
      vehicle.hours,
      promised.toISOString().slice(0, 10),
      true,
      new Date().toISOString(),
      normalizePatente(vehicle.patente),
      vehicle.marca,
      vehicle.modelo,
      vehicle.ano,
      "Auto",
      `VIN${normalizePatente(vehicle.patente).replace("-", "")}2026`,
      `MOT${normalizePatente(vehicle.patente).replace("-", "")}`,
      vehicle.color,
      vehicle.kilometraje,
      vehicle.cantidad_combustible,
      "En Taller",
      servicios,
      vehicle.observaciones,
      vehicle.comentario_tecnico,
      false,
      false,
      companyId,
    ];
    if (existing.rows.length) {
      const updated = await client.query(
        `update vehicles
         set customer_name=$1, customer_rut=$2, customer_phone=$3, customer_address=$4,
             customer_city=$5, customer_email=$6, assigned_mechanic_id=$7,
             assigned_mechanic_name=$8, customer_advance=$9, attention_priority=$10,
             estimated_work_hours=$11, promised_delivery_date=$12, customer_authorized=$13,
             customer_authorized_at=$14, patente=$15, marca=$16, modelo=$17, ano=$18,
             tipo_vehiculo=$19, codigo_vin=$20, codigo_motor=$21, color=$22,
             kilometraje=$23, cantidad_combustible=$24, estado=$25, servicios=$26,
             observaciones=$27, comentario_tecnico=$28, salida_confirmada=$29,
             en_estacionamiento_manual=$30, work_timer_started_at=coalesce(work_timer_started_at, now()),
             updated_at=now()
         where id=$32 and company_id=$31
         returning *`,
        [...values, existing.rows[0].id],
      );
      row = updated.rows[0];
    } else {
      const created = await client.query(
        `insert into vehicles
          (customer_name, customer_rut, customer_phone, customer_address, customer_city,
           customer_email, assigned_mechanic_id, assigned_mechanic_name, customer_advance,
           attention_priority, estimated_work_hours, promised_delivery_date,
           customer_authorized, customer_authorized_at, patente, marca, modelo, ano,
           tipo_vehiculo, codigo_vin, codigo_motor, color, kilometraje, cantidad_combustible,
           estado, servicios, observaciones, comentario_tecnico, salida_confirmada,
           en_estacionamiento_manual, company_id, work_timer_started_at)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,now())
         returning *`,
        values,
      );
      row = created.rows[0];
    }

    await client.query("delete from vehicle_services where company_id = $1 and vehicle_id = $2", [companyId, row.id]);
    for (const [name, price] of vehicle.services) {
      const service = catalogByName.get(name);
      await client.query(
        `insert into vehicle_services
          (company_id, vehicle_id, service_id, service_name_snapshot, unit_price_snapshot,
           estimated_hours_snapshot, quantity, status, added_by)
         values ($1,$2,$3,$4,$5,$6,1,'En proceso',$7)`,
        [companyId, row.id, service?.id || null, name, price, Number(service?.estimated_hours) || 1, mechanic?.name || "Seed demo"],
      );
    }
    inserted.push(row);
  }
  return inserted;
};

const upsertBudgets = async (client, companyId) => {
  const inserted = [];
  for (const budget of budgets) {
    const subtotal = budget.items.reduce((sum, item) => sum + item[2] * item[3], 0);
    const total = Math.round(subtotal * (1 - budget.discount_percent / 100) * (1 + budget.tax_percent / 100));
    const existing = await client.query(
      "select id from budget_quotes where company_id = $1 and patente = $2 and customer_rut = $3 limit 1",
      [companyId, budget.patente, budget.customer_rut],
    );
    let budgetId;
    const values = [
      budget.customer_name,
      budget.customer_rut,
      budget.customer_phone,
      budget.customer_email,
      budget.customer_address,
      budget.customer_city,
      budget.patente,
      budget.vehicle,
      budget.notes,
      new Date().toISOString().slice(0, 10),
      new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      budget.discount_percent,
      budget.tax_percent,
      budget.advance_required,
      budget.payment_method,
      budget.terms,
      total,
      budget.status,
      companyId,
    ];
    if (existing.rows.length) {
      budgetId = existing.rows[0].id;
      await client.query(
        `update budget_quotes
         set customer_name=$1, customer_rut=$2, customer_phone=$3, customer_email=$4,
             customer_address=$5, customer_city=$6, patente=$7, vehicle=$8, notes=$9,
             issue_date=$10, expiry_date=$11, discount_percent=$12, tax_percent=$13,
             advance_required=$14, payment_method=$15, terms=$16, total=$17,
             status=$18, updated_at=now()
         where company_id=$19 and id=$20`,
        [...values, budgetId],
      );
      await client.query("delete from budget_quote_items where budget_quote_id = $1", [budgetId]);
    } else {
      const created = await client.query(
        `insert into budget_quotes
          (customer_name, customer_rut, customer_phone, customer_email, customer_address,
           customer_city, patente, vehicle, notes, issue_date, expiry_date,
           discount_percent, tax_percent, advance_required, payment_method, terms,
           total, status, company_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         returning id`,
        values,
      );
      budgetId = created.rows[0].id;
    }
    for (const [item_type, name, unit_price, quantity, estimated_hours] of budget.items) {
      await client.query(
        `insert into budget_quote_items
          (budget_quote_id, item_type, name, quantity, unit_price, price, estimated_hours)
         values ($1,$2,$3,$4,$5,$5,$6)`,
        [budgetId, item_type, name, quantity, unit_price, estimated_hours],
      );
    }
    inserted.push(budgetId);
  }
  return inserted;
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const company = await ensureCompany(client);
    const roleIds = await ensureRoles(client, company.id);
    const workshopUsers = await upsertUsers(client, company.id, roleIds);
    const inventoryBySku = await upsertInventory(client, company.id);
    const serviceRows = vehicles.flatMap((vehicle) => vehicle.services);
    const catalogByName = await ensureCatalogServices(client, company.id, serviceRows);
    const seededVehicles = await upsertVehicles(client, company.id, workshopUsers, inventoryBySku, catalogByName);
    const seededBudgets = await upsertBudgets(client, company.id);
    await client.query(
      `insert into audit_logs (company_id, user_name, module, action, detail)
       values ($1,'Seed demo','Sistema','Carga de datos de demostracion',$2)`,
      [
        company.id,
        `Usuarios: ${workshopUsers.length}; inventario: ${inventoryBySku.size}; vehiculos en taller: ${seededVehicles.length}; presupuestos: ${seededBudgets.length}`,
      ],
    );
    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          ok: true,
          company: company.name,
          users: workshopUsers.length,
          inventoryItems: inventoryBySku.size,
          vehiclesInWorkshop: seededVehicles.length,
          budgets: seededBudgets.length,
        },
        null,
        2,
      ),
    );
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
