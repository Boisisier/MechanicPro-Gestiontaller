# Diagramas para informe final - Mechanic Pro

Diagramas basados en el esquema actual del proyecto, principalmente en `server/schema.sql`.

## 1. Modelo Conceptual de Datos MER

```mermaid
graph TD;
    Empresa[Empresa];
    Usuario[Usuario del sistema];
    MiembroEmpresa[Miembro de empresa];
    Rol[Rol];
    UsuarioTaller[Usuario de taller];
    Vehiculo[Vehiculo / Atencion];
    Inventario[Item de inventario];
    Presupuesto[Presupuesto];
    ItemPresupuesto[Item de presupuesto];
    Auditoria[Registro de acciones];
    Estacionamiento[Liberacion de estacionamiento];

    Empresa---MiembroEmpresa;
    Usuario---MiembroEmpresa;
    Empresa---Rol;
    Empresa---UsuarioTaller;
    Rol---UsuarioTaller;
    Empresa---Vehiculo;
    UsuarioTaller---Vehiculo;
    Empresa---Inventario;
    Empresa---Presupuesto;
    Presupuesto---ItemPresupuesto;
    Empresa---Auditoria;
    Empresa---Estacionamiento;
    Vehiculo---Estacionamiento;
```

## 2. Modelo Logico de Datos

```mermaid
erDiagram
    COMPANIES ||--o{ COMPANY_MEMBERS : tiene
    USERS ||--o{ COMPANY_MEMBERS : pertenece
    COMPANIES ||--o{ ROLES : define
    COMPANIES ||--o{ WORKSHOP_USERS : administra
    ROLES ||--o{ WORKSHOP_USERS : asigna
    COMPANIES ||--o{ VEHICLES : registra
    WORKSHOP_USERS ||--o{ VEHICLES : atiende
    COMPANIES ||--o{ INVENTORY_ITEMS : posee
    COMPANIES ||--o{ BUDGET_QUOTES : genera
    BUDGET_QUOTES ||--o{ BUDGET_QUOTE_ITEMS : contiene
    COMPANIES ||--o{ AUDIT_LOGS : audita
    COMPANIES ||--o{ PARKING_RELEASES : registra
    VEHICLES ||--o{ PARKING_RELEASES : libera

    COMPANIES {
        uuid id PK
        text name
        timestamptz created_at
        timestamptz updated_at
    }

    USERS {
        uuid id PK
        text full_name
        text email UK
        text password_hash
        timestamptz created_at
        timestamptz updated_at
    }

    COMPANY_MEMBERS {
        uuid id PK
        uuid company_id FK
        uuid user_id FK
        text role
        timestamptz created_at
    }

    ROLES {
        uuid id PK
        uuid company_id FK
        text name
        text_array modules
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSHOP_USERS {
        uuid id PK
        uuid company_id FK
        text name
        text rut
        text email
        text password_hash
        uuid role_id FK
        text role_name
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }

    VEHICLES {
        uuid id PK
        uuid company_id FK
        text customer_name
        text customer_rut
        text customer_phone
        text customer_address
        text customer_city
        text customer_email
        uuid assigned_mechanic_id
        text assigned_mechanic_name
        numeric customer_advance
        text attention_priority
        numeric estimated_work_hours
        date promised_delivery_date
        boolean customer_authorized
        timestamptz customer_authorized_at
        timestamptz work_timer_started_at
        bigint work_elapsed_seconds
        text patente
        text marca
        text modelo
        integer ano
        text tipo_vehiculo
        text codigo_vin
        text codigo_motor
        text color
        integer kilometraje
        integer cantidad_combustible
        text estado
        text_array servicios
        text observaciones
        text comentario_tecnico
        boolean salida_confirmada
        timestamptz fecha_salida_confirmada
        boolean en_estacionamiento_manual
        timestamptz fecha_ingreso
        timestamptz created_at
        timestamptz updated_at
    }

    INVENTORY_ITEMS {
        uuid id PK
        uuid company_id FK
        text item_type
        text name
        text category
        text sku
        text barcode
        integer stock
        integer min_stock
        text unit
        text location
        text supplier
        numeric cost
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    BUDGET_QUOTES {
        uuid id PK
        uuid company_id FK
        text customer_name
        text customer_phone
        text patente
        text vehicle
        text notes
        numeric total
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    BUDGET_QUOTE_ITEMS {
        uuid id PK
        uuid budget_quote_id FK
        text name
        numeric price
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid company_id FK
        text user_name
        text module
        text action
        text detail
        timestamptz created_at
    }

    PARKING_RELEASES {
        uuid id PK
        uuid company_id FK
        uuid vehicle_id FK
        text released_by
        text detail
        timestamptz created_at
    }
```

## 3. Diagrama de Clases

```mermaid
classDiagram
    class Company {
        +id
        +name
        +created_at
        +updated_at
    }

    class User {
        +id
        +full_name
        +email
        +password_hash
    }

    class Role {
        +id
        +name
        +modules
    }

    class WorkshopUser {
        +id
        +name
        +rut
        +email
        +password_hash
        +role_name
        +active
    }

    class Vehicle {
        +id
        +patente
        +marca
        +modelo
        +ano
        +estado
        +customer_name
        +customer_rut
        +customer_advance
        +servicios
        +registrarIngreso()
        +enviarATaller()
        +enviarASalida()
        +marcarListo()
        +enviarAEstacionamiento()
    }

    class InventoryItem {
        +id
        +item_type
        +name
        +sku
        +barcode
        +stock
        +min_stock
        +descontarStock()
    }

    class BudgetQuote {
        +id
        +customer_name
        +patente
        +vehicle
        +total
        +status
        +calcularTotal()
    }

    class BudgetQuoteItem {
        +id
        +name
        +price
    }

    class AuditLog {
        +id
        +user_name
        +module
        +action
        +detail
        +created_at
    }

    class ParkingRelease {
        +id
        +released_by
        +detail
        +created_at
    }

    Company "1" --> "0..*" WorkshopUser
    Company "1" --> "0..*" Role
    Company "1" --> "0..*" Vehicle
    Company "1" --> "0..*" InventoryItem
    Company "1" --> "0..*" BudgetQuote
    Company "1" --> "0..*" AuditLog
    Company "1" --> "0..*" ParkingRelease
    Role "1" --> "0..*" WorkshopUser
    WorkshopUser "1" --> "0..*" Vehicle
    BudgetQuote "1" --> "1..*" BudgetQuoteItem
    Vehicle "1" --> "0..*" ParkingRelease
```

## 4. Diagramas de Secuencia

### 4.1 Inicio de sesion

```mermaid
sequenceDiagram
    actor Usuario
    participant Frontend as React App
    participant API as Express API
    participant DB as PostgreSQL

    Usuario->>Frontend: Ingresa correo y contrasena
    Frontend->>API: POST /auth/login
    API->>DB: Buscar usuario o usuario de taller
    DB-->>API: Credenciales y rol
    API->>API: Validar password y generar token
    API-->>Frontend: Token, usuario y rol
    Frontend->>Frontend: Guardar token y permisos
    Frontend-->>Usuario: Mostrar modulos permitidos
```

### 4.2 Registro de vehiculo y envio a taller

```mermaid
sequenceDiagram
    actor Administrativo
    participant Frontend as React App
    participant API as Express API
    participant DB as PostgreSQL

    Administrativo->>Frontend: Completa formulario de ingreso
    Frontend->>Frontend: Valida campos obligatorios
    Administrativo->>Frontend: Confirma ingresar vehiculo
    Frontend->>API: POST /vehicles
    API->>DB: Insertar vehicle con estado Ingresado
    DB-->>API: Vehiculo creado
    Frontend->>API: PUT /vehicles/:id estado En Taller
    API->>DB: Actualizar estado, mecanico y temporizador
    API-->>Frontend: Vehiculo actualizado
    Frontend-->>Administrativo: Vehiculo disponible en En Taller
```

### 4.3 Trabajo en taller, servicios e inventario

```mermaid
sequenceDiagram
    actor Mecanico
    participant Frontend as React App
    participant API as Express API
    participant DB as PostgreSQL

    Mecanico->>Frontend: Selecciona vehiculo en En Taller
    Frontend->>API: GET /inventory-items
    API->>DB: Consultar repuestos e insumos
    DB-->>API: Inventario disponible
    API-->>Frontend: Lista de items
    Mecanico->>Frontend: Agrega servicios, repuestos e insumos
    Frontend->>API: PUT /vehicles/:id
    API->>DB: Guardar servicios en atencion
    API->>DB: Actualizar stock de inventario
    DB-->>API: Cambios guardados
    API-->>Frontend: Atencion actualizada
    Frontend-->>Mecanico: Trabajo registrado
```

### 4.4 Salida y estacionamiento

```mermaid
sequenceDiagram
    actor Administrativo
    participant Frontend as React App
    participant API as Express API
    participant DB as PostgreSQL

    Administrativo->>Frontend: Revisa vehiculo en Salida
    Frontend->>Frontend: Calcula servicios, repuestos, insumos y abono
    Administrativo->>Frontend: Completa valores finales
    Frontend->>API: PUT /vehicles/:id
    API->>DB: Guardar totales y fecha de salida
    API-->>Frontend: Vehiculo listo
    Administrativo->>Frontend: Enviar a estacionamiento
    Frontend->>API: PUT /vehicles/:id
    API->>DB: Marcar estacionamiento manual
    Frontend->>API: POST /parking-releases
    API->>DB: Registrar movimiento de estacionamiento
    API-->>Frontend: Estacionamiento actualizado
```

### 4.5 Registro de acciones

```mermaid
sequenceDiagram
    actor Usuario
    participant Frontend as React App
    participant API as Express API
    participant DB as PostgreSQL

    Usuario->>Frontend: Ejecuta accion critica
    Frontend->>API: POST /audit-logs
    API->>DB: Insertar accion, modulo, usuario y detalle
    DB-->>API: Registro creado
    API-->>Frontend: Confirmacion
    Usuario->>Frontend: Consulta registro de acciones
    Frontend->>API: GET /audit-logs?dateFrom&dateTo
    API->>DB: Filtrar registros por empresa y fecha
    DB-->>API: Lista paginada
    API-->>Frontend: Auditoria disponible
```

## 5. Diagramas de Colaboracion

### 5.1 Colaboracion: ingreso de vehiculo

```mermaid
graph LR;
    Administrativo[Administrativo];
    Formulario[Formulario de ingreso];
    Buscador[Busqueda patente RUT];
    Catalogo[Catalogo de servicios];
    Usuarios[Usuarios taller];
    API[API Vehicles];
    DB[(PostgreSQL)];

    Administrativo-->|1 completa datos|Formulario;
    Formulario-->|2 consulta antecedentes|Buscador;
    Buscador-->|3 busca vehiculos|API;
    API-->|4 consulta|DB;
    Formulario-->|5 selecciona servicios|Catalogo;
    Formulario-->|6 asigna mecanico|Usuarios;
    Formulario-->|7 guarda ingreso|API;
    API-->|8 inserta vehiculo|DB;
```

### 5.2 Colaboracion: trabajo en taller

```mermaid
graph LR;
    Mecanico[Mecanico];
    Taller[Modulo En Taller];
    Servicios[Servicios realizados];
    Inventario[Inventario];
    API[API Vehicles e Inventory];
    DB[(PostgreSQL)];

    Mecanico-->|1 selecciona vehiculo|Taller;
    Taller-->|2 agrega servicios|Servicios;
    Taller-->|3 busca repuestos e insumos|Inventario;
    Inventario-->|4 valida stock|API;
    API-->|5 consulta inventario|DB;
    Taller-->|6 guarda atencion|API;
    API-->|7 actualiza vehiculo y stock|DB;
```

### 5.3 Colaboracion: cierre de atencion

```mermaid
graph LR;
    Administrativo[Administrativo];
    Salida[Modulo Salida];
    Calculadora[Resumen de valores];
    Vehiculo[Registro vehiculo];
    Estacionamiento[Modulo Estacionamiento];
    API[API];
    DB[(PostgreSQL)];

    Administrativo-->|1 revisa salida|Salida;
    Salida-->|2 calcula total|Calculadora;
    Calculadora-->|3 considera abono|Vehiculo;
    Administrativo-->|4 marca listo|Salida;
    Salida-->|5 actualiza estado|API;
    API-->|6 guarda fecha salida|DB;
    Administrativo-->|7 envia a estacionamiento|Estacionamiento;
    Estacionamiento-->|8 registra movimiento|API;
    API-->|9 guarda estacionamiento|DB;
```

## 6. Diagrama de Arquitectura

```mermaid
graph TD;
    Usuario[Usuario navegador];
    UI[React + TypeScript + Vite];
    Componentes[Componentes UI y modulos];
    APIClient[src/lib/api.ts];
    Backend[Node.js + Express];
    Auth[Middleware JWT y roles];
    DB[(PostgreSQL / Supabase)];
    Migraciones[Supabase migrations + server/schema.sql];

    Usuario-->UI;
    UI-->Componentes;
    Componentes-->APIClient;
    APIClient-->|HTTP REST JSON|Backend;
    Backend-->Auth;
    Auth-->Backend;
    Backend-->|SQL pg|DB;
    Migraciones-->|crea y actualiza tablas|DB;

    subgraph Frontend
        UI;
        Componentes;
        APIClient;
    end

    subgraph Backend_API
        Backend;
        Auth;
    end

    subgraph Datos
        DB;
        Migraciones;
    end
```

## 7. Arquitectura por capas

```mermaid
graph TD;
    Presentacion[Capa de presentacion React]
    Servicios[Capa de comunicacion API client]
    Negocio[Capa de negocio Express routes]
    Seguridad[Capa de seguridad JWT roles permisos]
    Persistencia[Capa de persistencia PostgreSQL]

    Presentacion-->Servicios;
    Servicios-->Negocio;
    Negocio-->Seguridad;
    Negocio-->Persistencia;
    Seguridad-->Persistencia;
```

