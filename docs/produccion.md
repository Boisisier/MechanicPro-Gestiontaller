# Preparación de producción

## Variables obligatorias

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`: mínimo 32 caracteres
- `CORS_ORIGINS`: dominios permitidos separados por coma
- `VITE_API_BASE_URL`: URL pública de la API

Usar `.env.example` como referencia. Nunca versionar `.env`.

## Validación previa

```bash
npm ci
npm run check
npm run verify:schema
```

`npm run check` incluye tests de integración de la API (`server/test/`) contra una base
descartable — se saltan solos si no está definida `TEST_DATABASE_URL`. Para correrlos:

```bash
TEST_DATABASE_URL=postgresql://app_runtime:clave@host:5432/base npm run test:integration
```

Aplicar migraciones antes de desplegar. `supabase db push` depende de que el proyecto
vinculado (`supabase link`) coincida con `DATABASE_URL` — si no estás seguro, usar el runner
propio, que aplica directo contra `DATABASE_URL` sin depender del link:

```bash
DATABASE_URL=<conexión con permisos de DDL, ej. rol postgres> npm run migrate
```

## Salud del servicio

- `/health/live`: proceso activo.
- `/health/ready`: aplicación y PostgreSQL disponibles.
- `/health`: compatibilidad con verificaciones existentes.

La plataforma de despliegue debe dirigir tráfico únicamente cuando
`/health/ready` responda HTTP 200.

## Seguridad

- Publicar la API solo mediante HTTPS.
- Configurar `CORS_ORIGINS` con dominios exactos, sin `*`.
- Rotar `JWT_SECRET` mediante el gestor de secretos del proveedor.
- Mantener `DATABASE_SSL=require`.
- Habilitar `TRUST_PROXY=true` detrás de un proxy confiable.
- `DATABASE_URL` **debe** usar el rol `app_runtime` (creado por la migración
  `20260707020000_create_app_runtime_role.sql`), nunca el rol `postgres`/admin de Supabase.
  El aislamiento entre empresas se hace con Row Level Security
  (`20260707000000_enable_row_level_security.sql`); el rol `postgres` tiene el atributo
  `BYPASSRLS`, así que conectado como `postgres` esas políticas no protegen nada. El esquema
  (tablas, columnas) se administra solo con migraciones — `app_runtime` no tiene permisos de
  DDL a propósito.

## Base de datos

- Ejecutar respaldo diario de PostgreSQL.
- Probar restauración mensualmente.
- Conservar al menos 30 días de respaldos.
- Ejecutar migraciones primero en staging.

Ejemplo de respaldo:

```bash
pg_dump "$DATABASE_URL" --format=custom --file="mechanicpro-$(date +%F).dump"
```

## Despliegue

1. Ejecutar CI.
2. Respaldar PostgreSQL.
3. Aplicar migraciones.
4. Ejecutar `npm run verify:schema`.
5. Desplegar API y frontend.
6. Verificar `/health/ready`.
7. Ejecutar una prueba de ingreso, taller, salida e inventario.
