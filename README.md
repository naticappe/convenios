# Sistema de Gestión de Convenios — Conci Carpinella

Aplicación web completa para la gestión de convenios médicos con obras sociales.

---

## Tecnologías utilizadas

| Capa       | Tecnología                                       |
|------------|--------------------------------------------------|
| Backend    | .NET 8, C#, Web API REST                         |
| Base de datos | PostgreSQL + Entity Framework Core            |
| Autenticación | JWT (tokens de seguridad)                    |
| Frontend   | React 19, TypeScript, Vite                       |
| Estilos    | Tailwind CSS v4                                  |
| Peticiones | Axios + React Query                              |

---

## Estructura del proyecto

```
mi-app/
├── ConciCarpinella.API/          ← Backend .NET 8
│   ├── Controllers/              ← Endpoints de la API
│   ├── Data/                     ← Base de datos y datos iniciales
│   ├── DTOs/                     ← Objetos de transferencia de datos
│   ├── Middleware/               ← Manejo global de errores
│   ├── Models/                   ← Entidades de la base de datos
│   ├── Services/                 ← Lógica de autenticación
│   ├── Program.cs                ← Punto de entrada del servidor
│   └── appsettings.json          ← Configuración (BD, JWT, CORS)
│
└── ConciCarpinella.Web/          ← Frontend React
    └── src/
        ├── components/           ← Layout, Sidebar, Navbar
        ├── context/              ← Estado global de sesión
        ├── pages/                ← Pantallas de la aplicación
        ├── services/             ← Llamadas a la API
        └── types/                ← Tipos TypeScript
```

---

## Cómo levantar el proyecto

### Requisitos previos
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/)

### Paso 1 — Preparar la base de datos

1. Abrir pgAdmin o la terminal de PostgreSQL
2. Crear la base de datos:
   ```sql
   CREATE DATABASE "ConciCarpinella";
   ```
3. Verificar que el usuario `postgres` tiene contraseña `admin123`
   (o ajustar la contraseña en `ConciCarpinella.API/appsettings.json`)

### Paso 2 — Instalar herramientas del backend

```bash
# Instalar la herramienta de migraciones de Entity Framework
dotnet tool install --global dotnet-ef
```

### Paso 3 — Levantar el Backend

```bash
cd ConciCarpinella.API

# Restaurar paquetes NuGet
dotnet restore

# Crear las tablas en la base de datos
dotnet ef migrations add Inicial
dotnet ef database update

# Iniciar el servidor
dotnet run
```

El backend estará disponible en:
- API: `https://localhost:7001`
- Swagger (documentación): `https://localhost:7001/swagger`

> Al iniciar por primera vez se crea automáticamente:
> - Usuario admin: `admin@concicarpinella.com` / `Admin123!`
> - Nomencladores base: PMC, INOS, PMO
> - Conceptos base

### Paso 4 — Levantar el Frontend

```bash
cd ConciCarpinella.Web

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

---

## Usuarios y roles

| Rol        | Descripción                                          |
|------------|------------------------------------------------------|
| Admin      | Acceso total: usuarios, configuración, todo el CRUD  |
| DataEntry  | Puede crear y editar obras sociales, planes, valores |
| Analista   | Solo lectura: consultas y reportes                   |
| Secretario | Acceso a autorizaciones y coberturas                 |

---

## Módulos del sistema

| Módulo          | Descripción                                           |
|-----------------|-------------------------------------------------------|
| Obras Sociales  | Alta, baja y modificación de obras sociales           |
| Planes          | Planes de cada obra social                            |
| Nomencladores   | Clasificaciones de prácticas (PMC, INOS, PMO, etc.)   |
| Prácticas       | Códigos y descripciones de prestaciones médicas       |
| Valores         | Valores económicos por plan y práctica                |
| Coseguros       | Porcentajes o montos a cargo del paciente             |
| Coberturas      | Qué cubre cada plan y en qué porcentaje               |
| Autorizaciones  | Gestión de autorizaciones médicas                     |
| Traductor       | Equivalencias entre nomencladores                     |
| Conceptos       | Categorías de facturación (ingresos/egresos/ajustes)  |
| Usuarios        | Administración de usuarios del sistema (solo Admin)   |

---

## Colores del sistema

- **Azul institucional**: `#005781`
- **Salmón**: `#E8A882`

---

## Comandos útiles

```bash
# Ver estado de la base de datos
dotnet ef migrations list

# Agregar una nueva migración después de cambiar los modelos
dotnet ef migrations add NombreDeLaMigracion

# Revertir la última migración
dotnet ef migrations remove

# Compilar el frontend para producción
npm run build
```

---

## Notas de seguridad para producción

Antes de pasar a producción, cambiar en `appsettings.json`:
1. La cadena de conexión (usuario y contraseña de la BD)
2. `Jwt.SecretKey` → una clave larga y aleatoria
3. `Cors.AllowedOrigins` → solo el dominio real del frontend
4. Cambiar la contraseña del usuario admin inicial
