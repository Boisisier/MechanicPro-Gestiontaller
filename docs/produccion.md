# Preparación de producción

## Variables obligatorias

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`: mínimo 32 caracteres
- `CORS_ORIGINS`: dominios permitidos separados por coma
- `VITE_API_BASE_URL`: URL pública de la API

## Variables opcionales con efecto visible

- `PUBLIC_WEB_URL`: URL pública del frontend. Sin ella, la recuperación de acceso del portal de
  clientes (`/public/recover-access`) responde igual que siempre —nunca revela si hubo
  coincidencia— pero **no llega a enviar nada**. En producción el frontend y la API son servicios
  distintos con dominios distintos, así que el servidor no puede deducirla.
- `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`: sin estos dos, el envío del link queda
  en modo simulado (solo deja un registro en el log). Ver "Portal de clientes" más abajo.

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

**Esto ya está automatizado.** El job `migrate-production` de `.github/workflows/ci.yml`
corre `npm run migrate` contra producción en cada push a `main`, después de que el job
`validate` (tests, lint, typecheck, build) pase — usa el mismo secreto `BACKUP_DATABASE_URL`
que ya usa el respaldo diario (rol `postgres`/admin, con permisos de DDL). El comando manual de
arriba solo hace falta si migrás a mano fuera de ese flujo (por ejemplo, contra una base nueva).

Ojo con el orden: Render despliega el código nuevo apenas detecta el push, en paralelo a este
job de GitHub Actions — no espera a que las migraciones terminen. En la práctica la migración
tarda segundos y el riesgo de que el código nuevo pise una migración a medio aplicar es bajo,
pero si algún día se vuelve un problema real, la forma de eliminarlo del todo es desactivar el
auto-deploy de Render y disparar el deploy desde este mismo job (vía el Deploy Hook de cada
servicio) recién después de que la migración termine.

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

## Portal de clientes: envío del link por WhatsApp

El cliente del taller recibe un link `https://<frontend>/estado/<token>` con el estado de su
vehículo y, si hay presupuesto, la posibilidad de aprobar o rechazar cada partida. Ese link es
una credencial: quien lo tiene ve la ficha, así que no se loguea nunca completo.

Si el cliente lo pierde, puede pedir que se lo reenvíen en `/recuperar` dando su patente y los
primeros 4 dígitos del RUT. Ese reenvío es lo único que necesita un proveedor de mensajería.

**Sin configurar, funciona en modo simulado:** el flujo completo corre y solo queda un registro
`recovery_link_simulated` en el log (en desarrollo además imprime el link en consola). No hace
falta configurar nada para que el resto del portal funcione.

**Para activar el envío real** hay que dar de alta la WhatsApp Cloud API en Meta:

1. En [developers.facebook.com](https://developers.facebook.com) crear una app de tipo Business
   y agregarle el producto **WhatsApp**.
2. Asociar un número de teléfono dedicado (no puede ser uno que ya esté en WhatsApp normal o
   Business) y completar la **verificación del negocio**. Este paso lo revisa Meta a mano y
   puede tardar varios días; hasta que lo apruebe, solo se puede enviar a números de prueba.
3. Crear una **plantilla de mensaje** (Message Template) y esperar su aprobación. Meta no
   permite texto libre en un mensaje que inicia el negocio. La plantilla tiene que tener
   **exactamente un parámetro en el cuerpo**, que es el link. Por ejemplo:

   > Hola, acá está el link para seguir el estado de tu vehículo: {{1}}

   El nombre que se le dé va en `WHATSAPP_RECOVERY_TEMPLATE` (por defecto
   `recuperar_link_seguimiento`) y su idioma en `WHATSAPP_TEMPLATE_LANGUAGE` (por defecto `es`).
4. Completar en el servicio de la API de Render: `WHATSAPP_PHONE_NUMBER_ID` (lo da el panel de
   WhatsApp, no es el número en sí) y `WHATSAPP_ACCESS_TOKEN`.

**Ojo con el token:** el token temporal que muestra el panel dura 24 horas y sirve solo para
probar. Para producción hay que generar un token permanente desde un usuario del sistema
(Business Settings → System Users → Generate Token) con los permisos `whatsapp_business_messaging`
y `whatsapp_business_management`.

Qué mirar en los logs (ninguno incluye el teléfono completo ni el link):

| Registro | Significa |
| --- | --- |
| `recovery_link_sent` | Meta aceptó el mensaje |
| `recovery_link_simulated` | No hay credenciales configuradas |
| `recovery_link_phone_unusable` | El teléfono de la ficha no se pudo normalizar: hay que corregirlo |
| `recovery_link_failed` | Meta rechazó el envío (incluye el código y el motivo) |

## Suspender un taller que deja de pagar

Cada empresa tiene un `plan` y un `subscription_status` (`activa`, `suspendida`, `cancelada`).
Una empresa que no está `activa` **puede seguir entrando y leyendo todo lo suyo**, pero el
servidor rechaza con **402** cualquier operación que escriba, y el frontend le muestra un cartel
fijo explicando por qué. Cortar también la lectura sería retenerle sus propios datos al taller,
que además es justo lo que querría llevarse si decide irse.

```bash
# Ver cómo está cada empresa
node scripts/set-subscription.mjs --listar

# Suspender y reactivar
node scripts/set-subscription.mjs "Taller del Centro" --estado suspendida
node scripts/set-subscription.mjs "Taller del Centro" --estado activa

# Cambiar de plan
node scripts/set-subscription.mjs "Taller del Centro" --plan taller_pro
```

El servidor cachea el estado en memoria 30 segundos, así que un cambio puede tardar hasta ese
tiempo en hacerse efectivo. Si no se puede consultar el estado (problema de base de datos), el
middleware **deja escribir** a propósito: dejar sin trabajar a un taller que está al día es peor
que cobrarle un mes de más.

Cuando se conecte un proveedor de pagos, su webhook solo tiene que escribir `subscription_status`
en `companies` — no hace falta tocar las rutas.
