# MechanicPro

Sistema de gestión para talleres mecánicos. Multi-empresa: cada taller ve solo sus datos, y el
aislamiento está exigido a nivel de base de datos con Row Level Security, no solo en el código.

- **Frontend:** React + Vite + Tailwind (`src/`)
- **API:** Node + Express (`server/`)
- **Base de datos:** PostgreSQL en Supabase (`supabase/migrations/`)
- **Landing de marketing:** HTML estático (`landing/`)

## Levantar el proyecto

```bash
npm ci
cp .env.example .env    # y completar DATABASE_URL y JWT_SECRET
npm run dev:all         # frontend en :5173 + API en :3001
```

## Antes de subir un cambio

```bash
npm run check    # tests + lint + typecheck + build
```

Es lo mismo que corre CI, así que si pasa acá, pasa allá.

## Cambios en la base de datos

Las migraciones son archivos `.sql` en `supabase/migrations/`, con nombre
`AAAAMMDDHHMMSS_descripcion.sql`. **El prefijo numérico define el orden de aplicación**, así que
una migración nueva siempre va con fecha posterior a las existentes.

1. Crear el archivo a mano en `supabase/migrations/` con la fecha de hoy.
2. Escribir el SQL de forma idempotente (`create table if not exists`,
   `add column if not exists`, `drop constraint if exists` antes de `add constraint`): la misma
   migración se aplica contra la base de CI, contra producción, y contra cualquier base nueva.
3. Aplicarla en local:

   ```bash
   npm run migrate
   ```

4. Verificar que el esquema quedó como la app espera:

   ```bash
   npm run verify:schema
   ```

**En producción se aplican solas.** El job `migrate-production` de `.github/workflows/ci.yml`
corre las migraciones pendientes en cada push a `main`, después de que pasen los tests. No hay
que correr nada a mano ni usar `supabase db push` (el CLI depende de que el proyecto vinculado
coincida con `DATABASE_URL`, que ya causó problemas antes; `npm run migrate` aplica directo
contra `DATABASE_URL` y no depende del link).

## Operación

```bash
# Dar de alta un taller nuevo (todavía no hay registro público)
node scripts/create-company.mjs "Taller" "Admin" "12.345.678-9" "admin@taller.cl" "ClaveSegura123"

# Ver y cambiar el estado de suscripción de cada taller
node scripts/set-subscription.mjs --listar
node scripts/set-subscription.mjs "Taller" --estado suspendida
```

## Documentación

- [`docs/produccion.md`](docs/produccion.md): despliegue, seguridad, respaldos, portal de
  clientes y suspensión de cuentas.
- [`docs/diagramas-informe.md`](docs/diagramas-informe.md): diagramas del sistema.
