Ejecutar cambios en BD

1) Tener sql listo

2) Instalar supabase:
npm install -g supabase

3) Iniciar sesion con:
supabase login

4) Asociar con proyecto con:
supabase link --project-ref *id del proyecto en supabase* (se puede encontrar en "Project Settings")

4) Crear migracion usando:
supabase migration new *nombre migration*

5) Ir a carpeta supabase/migrations

6) Abrir nuevo archivo creado "idAutoGenerado_*nombre migration*.sql" y pegar sql

7) Correr:
supabase db push

## Validación

```bash
npm run check
npm run verify:schema
```

La guía de despliegue y seguridad está en `docs/produccion.md`.

