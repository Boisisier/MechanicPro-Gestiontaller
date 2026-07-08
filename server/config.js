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
