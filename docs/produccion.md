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

Aplicar migraciones antes de desplegar:

```bash
supabase db push
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
