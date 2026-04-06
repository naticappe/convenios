// ============================================================
// PROGRAMA PRINCIPAL - SISTEMA DE GESTIÓN DE CONVENIOS
// Conci Carpinella - Configuración del servidor Web API
// ============================================================

using System.Text;
using ConciCarpinella.API.Data;
using ConciCarpinella.API.Middleware;
using ConciCarpinella.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── 1. BASE DE DATOS ─────────────────────────────────────────
// Conectamos la aplicación con PostgreSQL usando Entity Framework
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── 2. AUTENTICACIÓN JWT ─────────────────────────────────────
// Configuramos el sistema de login con tokens (JSON Web Tokens)
var jwtConfig = builder.Configuration.GetSection("Jwt");
var secretKey  = jwtConfig["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey no configurada");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtConfig["Issuer"],
            ValidAudience            = jwtConfig["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

builder.Services.AddAuthorization();

// ── 3. CORS ───────────────────────────────────────────────────
// Permitimos que el frontend React pueda comunicarse con la API
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── 4. SERVICIOS DE LA APLICACIÓN ────────────────────────────
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ── 5. CONTROLADORES Y SWAGGER ───────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "Conci Carpinella - API de Gestión de Convenios",
        Version     = "v1",
        Description = "API REST para el sistema de gestión de obras sociales y convenios"
    });

    // Agregamos soporte para autenticación JWT en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Ingrese el token JWT con el prefijo 'Bearer ': Bearer {token}",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.ApiKey,
        Scheme      = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── 6. CONSTRUCCIÓN DE LA APP ─────────────────────────────────
var app = builder.Build();

// ── 7. MIGRACIONES Y DATOS INICIALES ─────────────────────────
// Al iniciar, aplica cambios pendientes en la BD y crea el usuario admin
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.InicializarAsync(scope.ServiceProvider);
    try
    {
        await NormasOperativasSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error en NormasOperativasSeeder: {ex.Message}");
        Console.WriteLine(ex.StackTrace);
    }

    // ── Creación manual de tablas UnidadArancel (si no existen) ──
    // Necesario porque la migración fue creada manualmente sin Designer.cs
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""UnidadesArancel"" (
                ""Id""            SERIAL          PRIMARY KEY,
                ""Nombre""        VARCHAR(150)    NOT NULL,
                ""VigenciaDesde"" DATE            NOT NULL,
                ""VigenciaHasta"" DATE            NOT NULL,
                ""Activo""        BOOLEAN         NOT NULL DEFAULT TRUE,
                ""CreatedAt""     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""CreatedBy""     BIGINT          NULL,
                ""UpdatedAt""     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UpdatedBy""     BIGINT          NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_UnidadesArancel_Nombre""
                ON ""UnidadesArancel"" (""Nombre"");

            CREATE TABLE IF NOT EXISTS ""UnidadesArancelAuditLog"" (
                ""Id""                        BIGSERIAL       PRIMARY KEY,
                ""UnidadArancelId""           INT             NOT NULL
                    REFERENCES ""UnidadesArancel""(""Id"") ON DELETE CASCADE,
                ""Accion""                    VARCHAR(30)     NOT NULL,
                ""FechaEvento""               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UsuarioId""                 BIGINT          NULL,
                ""UsuarioNombre""             VARCHAR(120)    NOT NULL DEFAULT '',
                ""Origen""                    VARCHAR(30)     NOT NULL DEFAULT 'MANUAL',
                ""TransactionId""             UUID            NULL,
                ""NombreAnterior""            VARCHAR(150)    NULL,
                ""VigenciaDesdeAnterior""     DATE            NULL,
                ""VigenciaHastaAnterior""     DATE            NULL,
                ""ActivoAnterior""            BOOLEAN         NULL,
                ""NombreNuevo""               VARCHAR(150)    NULL,
                ""VigenciaDesdeNuevo""        DATE            NULL,
                ""VigenciaHastaNuevo""        DATE            NULL,
                ""ActivoNuevo""               BOOLEAN         NULL,
                ""DatosAnteriores""           TEXT            NULL,
                ""DatosNuevos""               TEXT            NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_UnidadesArancelAuditLog_UnidadArancelId""
                ON ""UnidadesArancelAuditLog"" (""UnidadArancelId"");
        ");
        Console.WriteLine("✅ Tablas UnidadArancel verificadas/creadas.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error creando tablas UnidadArancel: {ex.Message}");
    }

    // ── Fallback: columnas nuevas en Practicas + tablas del módulo Prácticas Médicas ──
    // La migración 20260403000000_PracticasMedicasSchema también hace esto (IF NOT EXISTS),
    // pero este bloque garantiza que las columnas existan incluso si la migración no corrió.
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""Nombre""                 VARCHAR(300) NOT NULL DEFAULT '';
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""VigenciaDesde""          TIMESTAMPTZ  NOT NULL DEFAULT NOW();
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""VigenciaHasta""          TIMESTAMPTZ  NULL;
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""Activo""                 BOOLEAN      NOT NULL DEFAULT TRUE;
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""ClasificadorPracticaId"" INT          NULL;
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""CreatedAt""              TIMESTAMPTZ  NOT NULL DEFAULT NOW();
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""UpdatedAt""              TIMESTAMPTZ  NOT NULL DEFAULT NOW();
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""CreatedBy""              BIGINT       NULL;
            ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""UpdatedBy""              BIGINT       NULL;
        ");
        // Copiar Descripcion → Nombre para filas existentes
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE ""Practicas"" SET ""Nombre"" = ""Descripcion"" WHERE ""Nombre"" = '' AND ""Descripcion"" IS NOT NULL AND ""Descripcion"" <> '';
        ");
        // Índice único (NomencladorId, Codigo)
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Practicas_NomencladorId_Codigo""
                ON ""Practicas"" (""NomencladorId"", ""Codigo"");
        ");
        Console.WriteLine("✅ Columnas de Practicas verificadas/creadas.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error verificando columnas de Practicas: {ex.Message}");
    }

    // PracticaConceptoUnidades
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""PracticaConceptoUnidades"" (
                ""Id""               SERIAL          PRIMARY KEY,
                ""PracticaId""       INT             NOT NULL REFERENCES ""Practicas""(""Id"") ON DELETE CASCADE,
                ""ConceptoMaestroId"" INT            NOT NULL,
                ""UnidadArancelId""  INT             NULL,
                ""Unidades""         NUMERIC(10,4)   NOT NULL DEFAULT 0,
                ""Cantidad""         NUMERIC(10,4)   NOT NULL DEFAULT 1,
                ""VigenciaDesde""    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""VigenciaHasta""    TIMESTAMPTZ     NULL,
                ""Activo""           BOOLEAN         NOT NULL DEFAULT TRUE,
                ""CreatedAt""        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UpdatedAt""        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""CreatedBy""        BIGINT          NULL,
                ""UpdatedBy""        BIGINT          NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_PracticaConceptoUnidades_PracticaId_ConceptoMaestroId""
                ON ""PracticaConceptoUnidades"" (""PracticaId"", ""ConceptoMaestroId"");
        ");
        Console.WriteLine("✅ Tabla PracticaConceptoUnidades verificada/creada.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error verificando PracticaConceptoUnidades: {ex.Message}");
    }

    // PracticaAuditLogs
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""PracticaAuditLogs"" (
                ""Id""           BIGSERIAL       PRIMARY KEY,
                ""PracticaId""   INT             NOT NULL REFERENCES ""Practicas""(""Id"") ON DELETE CASCADE,
                ""Accion""       VARCHAR(30)     NOT NULL,
                ""Entidad""      VARCHAR(30)     NOT NULL DEFAULT 'Practica',
                ""EntidadId""    INT             NULL,
                ""FechaEvento""  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UsuarioId""    BIGINT          NULL,
                ""UsuarioNombre"" VARCHAR(120)   NOT NULL DEFAULT '',
                ""Origen""       VARCHAR(30)     NOT NULL DEFAULT 'API',
                ""TransactionId"" UUID           NULL,
                ""ValorAnterior"" TEXT           NULL,
                ""ValorNuevo""   TEXT            NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_PracticaAuditLogs_PracticaId""
                ON ""PracticaAuditLogs"" (""PracticaId"");
        ");
        Console.WriteLine("✅ Tabla PracticaAuditLogs verificada/creada.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error verificando PracticaAuditLogs: {ex.Message}");
    }

    // ── Creación manual de tablas NomencladorMaestro y ConceptoMaestro ──
    // Fallback por si la migración 20260402100000 falló o la DB fue reseteada.
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""NomencladorMaestro"" (
                ""Id""           SERIAL          PRIMARY KEY,
                ""Nombre""       VARCHAR(150)    NOT NULL,
                ""VigenciaDesde"" DATE           NOT NULL,
                ""VigenciaHasta"" DATE           NOT NULL,
                ""Activo""       BOOLEAN         NOT NULL DEFAULT TRUE,
                ""CreatedAt""    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UpdatedAt""    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""CreatedBy""    BIGINT          NULL,
                ""UpdatedBy""    BIGINT          NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_NomencladorMaestro_Nombre""
                ON ""NomencladorMaestro"" (""Nombre"");
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""NomencladorMaestroAuditLog"" (
                ""Id""                      BIGSERIAL   PRIMARY KEY,
                ""NomencladorMaestroId""    INT         NOT NULL
                    REFERENCES ""NomencladorMaestro""(""Id"") ON DELETE CASCADE,
                ""Accion""                  VARCHAR(30) NOT NULL,
                ""FechaEvento""             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ""UsuarioId""               BIGINT      NULL,
                ""UsuarioNombre""           VARCHAR(120) NOT NULL DEFAULT '',
                ""Origen""                  VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
                ""TransactionId""           UUID        NULL,
                ""NombreAnterior""          VARCHAR(150) NULL,
                ""VigenciaDesdeAnterior""   DATE        NULL,
                ""VigenciaHastaAnterior""   DATE        NULL,
                ""ActivoAnterior""          BOOLEAN     NULL,
                ""NombreNuevo""             VARCHAR(150) NULL,
                ""VigenciaDesdeNuevo""      DATE        NULL,
                ""VigenciaHastaNuevo""      DATE        NULL,
                ""ActivoNuevo""             BOOLEAN     NULL,
                ""DatosAnteriores""         TEXT        NULL,
                ""DatosNuevos""             TEXT        NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_NomencladorMaestroAuditLog_NomencladorMaestroId""
                ON ""NomencladorMaestroAuditLog"" (""NomencladorMaestroId"");
        ");
        Console.WriteLine("✅ Tablas NomencladorMaestro verificadas/creadas.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error creando tablas NomencladorMaestro: {ex.Message}");
    }

    // ── Creación manual de tablas ConceptoMaestro ─────────────────────
    // Fallback por si la migración 20260402100000 falló o la DB fue reseteada.
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""ConceptoMaestro"" (
                ""Id""           SERIAL          PRIMARY KEY,
                ""Nombre""       VARCHAR(150)    NOT NULL,
                ""Sigla""        VARCHAR(10)     NOT NULL,
                ""VigenciaDesde"" DATE           NOT NULL,
                ""VigenciaHasta"" DATE           NOT NULL,
                ""Activo""       BOOLEAN         NOT NULL DEFAULT TRUE,
                ""CreatedAt""    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UpdatedAt""    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""CreatedBy""    BIGINT          NULL,
                ""UpdatedBy""    BIGINT          NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ConceptoMaestro_Nombre""
                ON ""ConceptoMaestro"" (""Nombre"");
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ConceptoMaestro_Sigla""
                ON ""ConceptoMaestro"" (""Sigla"");
        ");
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""ConceptoMaestroAuditLog"" (
                ""Id""                  BIGSERIAL   PRIMARY KEY,
                ""ConceptoMaestroId""   INT         NOT NULL
                    REFERENCES ""ConceptoMaestro""(""Id"") ON DELETE CASCADE,
                ""Accion""              VARCHAR(30) NOT NULL,
                ""FechaEvento""         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ""UsuarioId""           BIGINT      NULL,
                ""UsuarioNombre""       VARCHAR(120) NOT NULL DEFAULT '',
                ""Origen""              VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
                ""TransactionId""       UUID        NULL,
                ""NombreAnterior""      VARCHAR(150) NULL,
                ""SiglaAnterior""       VARCHAR(10)  NULL,
                ""VigenciaDesdeAnterior"" DATE       NULL,
                ""VigenciaHastaAnterior"" DATE       NULL,
                ""ActivoAnterior""      BOOLEAN     NULL,
                ""NombreNuevo""         VARCHAR(150) NULL,
                ""SiglaNueva""          VARCHAR(10)  NULL,
                ""VigenciaDesdeNuevo""  DATE        NULL,
                ""VigenciaHastaNuevo""  DATE        NULL,
                ""ActivoNuevo""         BOOLEAN     NULL,
                ""DatosAnteriores""     TEXT        NULL,
                ""DatosNuevos""         TEXT        NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_ConceptoMaestroAuditLog_ConceptoMaestroId""
                ON ""ConceptoMaestroAuditLog"" (""ConceptoMaestroId"");
        ");
        Console.WriteLine("✅ Tablas ConceptoMaestro verificadas/creadas.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error creando tablas ConceptoMaestro: {ex.Message}");
    }

    // ── Creación manual de tablas ClasificadorPractica (si no existen) ──
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""ClasificadoresPractica"" (
                ""Id""          SERIAL          PRIMARY KEY,
                ""Nivel1""      VARCHAR(150)    NOT NULL,
                ""Nivel2""      VARCHAR(150)    NOT NULL,
                ""Nivel3""      VARCHAR(150)    NOT NULL,
                ""Activo""      BOOLEAN         NOT NULL DEFAULT TRUE,
                ""CreatedAt""   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""CreatedBy""   BIGINT          NULL,
                ""UpdatedAt""   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UpdatedBy""   BIGINT          NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ClasificadoresPractica_Nivel1_Nivel2_Nivel3""
                ON ""ClasificadoresPractica"" (""Nivel1"", ""Nivel2"", ""Nivel3"");

            CREATE TABLE IF NOT EXISTS ""ClasificadoresPracticaAuditLog"" (
                ""Id""                        BIGSERIAL       PRIMARY KEY,
                ""ClasificadorPracticaId""    INT             NOT NULL
                    REFERENCES ""ClasificadoresPractica""(""Id"") ON DELETE CASCADE,
                ""Accion""                    VARCHAR(30)     NOT NULL,
                ""FechaEvento""               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                ""UsuarioId""                 BIGINT          NULL,
                ""UsuarioNombre""             VARCHAR(120)    NOT NULL DEFAULT '',
                ""Origen""                    VARCHAR(30)     NOT NULL DEFAULT 'MANUAL',
                ""TransactionId""             UUID            NULL,
                ""Nivel1Anterior""            VARCHAR(150)    NULL,
                ""Nivel2Anterior""            VARCHAR(150)    NULL,
                ""Nivel3Anterior""            VARCHAR(150)    NULL,
                ""ActivoAnterior""            BOOLEAN         NULL,
                ""Nivel1Nuevo""               VARCHAR(150)    NULL,
                ""Nivel2Nuevo""               VARCHAR(150)    NULL,
                ""Nivel3Nuevo""               VARCHAR(150)    NULL,
                ""ActivoNuevo""               BOOLEAN         NULL,
                ""DatosAnteriores""           TEXT            NULL,
                ""DatosNuevos""               TEXT            NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_ClasificadoresPracticaAuditLog_ClasificadorPracticaId""
                ON ""ClasificadoresPracticaAuditLog"" (""ClasificadorPracticaId"");
        ");
        Console.WriteLine("✅ Tablas ClasificadorPractica verificadas/creadas.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error creando tablas ClasificadorPractica: {ex.Message}");
    }
}

// ── 8. PIPELINE HTTP ─────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Conci Carpinella API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
