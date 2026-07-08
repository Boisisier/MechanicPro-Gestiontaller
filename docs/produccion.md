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

- Publicar la API solo mediante HTTPS. Es obligatorio: la sesión viaja en una cookie
  `auth_token` httpOnly con `SameSite=None; Secure` en producción (frontend y API pueden vivir
  en dominios distintos), y los navegadores descartan cookies `Secure` fuera de HTTPS.
- Configurar `CORS_ORIGINS` con dominios exactos, sin `*` (obligatorio además porque CORS ya
  corre con `credentials: true` para que las cookies crucen dominios).
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

El respaldo diario está automatizado en `.github/workflows/backup.yml`: corre todos los días a
las 08:00 UTC (y también a demanda, desde la pestaña Actions → "Backup base de datos" → "Run
workflow"), hace `pg_dump` y sube el resultado como artifact de GitHub Actions con 90 días de
retención (supera el mínimo de 30 días).

**Configuración necesaria (una sola vez):** agregar el secret `BACKUP_DATABASE_URL` en
GitHub → Settings → Secrets and variables → Actions. Debe ser la conexión con el rol
`postgres`/admin de Supabase (no `app_runtime`): el respaldo necesita ver el esquema completo
—incluidas las políticas de RLS y los permisos— y `app_runtime` está deliberadamente restringido
a datos, sin visibilidad total de esos objetos.

**Restaurar un respaldo:**

1. Descargar el artifact desde la corrida del workflow que lo generó (Actions → esa corrida →
   "Artifacts").
2. `pg_restore --clean --if-exists -d "$DATABASE_URL" mechanicpro-<fecha>.dump` (usar la
   conexión `postgres`/admin, igual que para migraciones).

Probar esta restauración mensualmente contra una base descartable (no la de producción) — el
objetivo es confirmar que el respaldo sirve, no solo que se generó. Ejecutar migraciones primero
en staging antes de aplicarlas en producción.

## Despliegue

1. Ejecutar CI.
2. Respaldar PostgreSQL.
3. Aplicar migraciones.
4. Ejecutar `npm run verify:schema`.
5. Desplegar API y frontend.
6. Verificar `/health/ready`.
7. Ejecutar una prueba de ingreso, taller, salida e inventario.

## Desplegar en Render

`render.yaml` en la raíz del repo define los dos servicios (API + frontend) como Blueprint —
Render los crea juntos en un solo paso en vez de configurar cada uno a mano.

1. En [dashboard.render.com](https://dashboard.render.com), **New → Blueprint**, conectar el
   repo de GitHub (`Boisisier/MechanicPro-Gestiontaller`). Render detecta `render.yaml` solo.
2. Al crear el Blueprint, Render pide valores para las variables marcadas `sync: false`.
   Completar en la API (`mechanicpro-gestiontaller-api`):
   - `DATABASE_URL`: la conexión de `app_runtime` del proyecto de Supabase (ver sección
     Seguridad más arriba — nunca el rol `postgres`).
   - `JWT_SECRET`: un secreto nuevo de al menos 32 caracteres, distinto del de desarrollo.
   - `CORS_ORIGINS`: dejarlo vacío por ahora, se completa en el paso 4.
   `VITE_API_BASE_URL` (en el servicio del frontend) también se puede dejar vacío por ahora.
3. Esperar a que ambos servicios terminen de desplegar. Render les asigna URLs del tipo
   `https://mechanicpro-gestiontaller-api.onrender.com` y
   `https://mechanicpro-gestiontaller-web.onrender.com` (si esos nombres ya están tomados por
   otra cuenta, Render ofrece una variante — anotar la URL real que quede asignada).
4. Volver a cada servicio → **Environment** y completar lo que quedó pendiente con las URLs
   reales del paso 3:
   - En la API: `CORS_ORIGINS` = URL del frontend (ej.
     `https://mechanicpro-gestiontaller-web.onrender.com`).
   - En el frontend: `VITE_API_BASE_URL` = URL de la API (ej.
     `https://mechanicpro-gestiontaller-api.onrender.com`). Como esta variable se usa en el
     *build* (Vite la incrusta en el bundle, no la lee en runtime), hay que disparar un
     **Manual Deploy** del frontend después de guardarla — si no, sigue apuntando a
     `localhost:3001`.
5. Aplicar las migraciones contra la base de Supabase (paso "Validación previa" más arriba,
   con el rol `postgres`) si todavía no se hizo.
6. Verificar `https://<api>.onrender.com/health/ready` → `{"status":"ready"}`, y probar el
   login desde el frontend desplegado.

El plan `starter` en la API evita que se "duerma" por inactividad (importante si más adelante
hay webhooks de pago que necesitan llegar en cualquier momento); el frontend estático no se
duerme nunca, así que el plan `free` alcanza.
