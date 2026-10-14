const parseList = (value, fallback = []) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(fallback)
    .filter((item, index, all) => all.indexOf(item) === index);

export const loadConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const databaseUrl = process.env.DATABASE_URL || "";
  const jwtSecret = process.env.JWT_SECRET || "";
  const errors = [];

  if (!databaseUrl) errors.push("DATABASE_URL es obligatoria");
  if (!jwtSecret) errors.push("JWT_SECRET es obligatoria");
  if (isProduction && jwtSecret.length < 32) {
    errors.push("JWT_SECRET debe tener al menos 32 caracteres en producción");
  }
  if (isProduction && !process.env.CORS_ORIGINS) {
    errors.push("CORS_ORIGINS es obligatoria en producción");
  }
  if (errors.length) {
    throw new Error(`Configuración inválida: ${errors.join("; ")}`);
  }

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT) || 3001,
    databaseUrl,
    jwtSecret,
    allowDemoLogin: !isProduction || process.env.ALLOW_DEMO_LOGIN === "true",
    corsOrigins: parseList(process.env.CORS_ORIGINS, isProduction
      ? []
      : ["http://localhost:5173", "http://127.0.0.1:5173"]),
    // Fase 4 del portal de clientes: para armar el link de recuperación
    // (`${publicWebUrl}/estado/<token>`) el server necesita saber dónde vive el frontend
    // estático (son servicios separados en Render, ver render.yaml). No es obligatoria: si
    // falta, /public/recover-access sigue respondiendo igual (nunca revela si hubo
    // coincidencia) pero no llega a "enviar" nada, y queda logueado para notarlo.
    publicWebUrl: process.env.PUBLIC_WEB_URL || (isProduction ? "" : "http://localhost:5173"),
    // WhatsApp Cloud API (Meta) para reenviar el link de seguimiento al cliente del taller.
    // Todo opcional: sin phoneNumberId + accessToken el envío queda en modo simulado (solo
    // loguea), que es el comportamiento que tenía antes de conectar un proveedor. Un mensaje
    // iniciado por el negocio exige una PLANTILLA aprobada por Meta — no se puede mandar texto
    // libre — así que el nombre de la plantilla también es configurable; ver docs/produccion.md
    // para cómo tiene que estar armada (un parámetro de cuerpo: el link).
    whatsapp: {
      apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
      recoveryTemplate: process.env.WHATSAPP_RECOVERY_TEMPLATE || "recuperar_link_seguimiento",
      templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "es",
    },
    databaseSsl: process.env.DATABASE_SSL !== "disable",
    databaseSslRejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
    trustProxy: process.env.TRUST_PROXY === "true" ? 1 : false,
    bodyLimit: process.env.JSON_BODY_LIMIT || "1mb",
    // El JWT viaja en una cookie httpOnly (no en localStorage), así que JavaScript nunca puede
    // leerlo aunque haya un XSS. En producción el frontend y la API pueden vivir en dominios
    // distintos, así que hace falta SameSite=None + Secure (HTTPS ya es obligatorio). En
    // desarrollo, localhost:5173 -> localhost:3001 es same-site, así que Lax alcanza sin HTTPS.
    authCookie: {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAgeMs: 8 * 60 * 60 * 1000,
    },
  };
};
