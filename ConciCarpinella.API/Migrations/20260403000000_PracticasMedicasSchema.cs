using ConciCarpinella.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <summary>
    /// Migración que expande la tabla Practicas al nuevo schema del módulo Prácticas Médicas
    /// y crea las tablas PracticaConceptoUnidades y PracticaAuditLogs.
    ///
    /// Se usa migrationBuilder.Sql() con IF NOT EXISTS para que sea idempotente:
    /// si el Program.cs ya creó las columnas/tablas, esta migración no falla.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260403000000_PracticasMedicasSchema")]
    public partial class PracticasMedicasSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Ampliar tabla Practicas ──────────────────────────────────
            // Usamos IF NOT EXISTS para que sea idempotente con el código de Program.cs.
            migrationBuilder.Sql(@"
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""Nombre""              VARCHAR(300) NOT NULL DEFAULT '';
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""VigenciaDesde""       TIMESTAMPTZ  NOT NULL DEFAULT NOW();
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""VigenciaHasta""       TIMESTAMPTZ  NULL;
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""Activo""              BOOLEAN      NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""ClasificadorPracticaId"" INT       NULL;
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""CreatedAt""           TIMESTAMPTZ  NOT NULL DEFAULT NOW();
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""UpdatedAt""           TIMESTAMPTZ  NOT NULL DEFAULT NOW();
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""CreatedBy""           BIGINT       NULL;
                ALTER TABLE ""Practicas"" ADD COLUMN IF NOT EXISTS ""UpdatedBy""           BIGINT       NULL;
            ");

            // ── 2. Copiar Descripcion → Nombre donde aún esté vacío ─────────
            migrationBuilder.Sql(@"
                UPDATE ""Practicas""
                   SET ""Nombre"" = ""Descripcion""
                 WHERE ""Nombre"" = ''
                   AND ""Descripcion"" IS NOT NULL;
            ");

            // ── 3. Agregar FK a ClasificadoresPractica (si la tabla existe) ──
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'FK_Practicas_ClasificadorPracticaId'
                  ) THEN
                    IF EXISTS (
                      SELECT 1 FROM information_schema.tables
                       WHERE table_name = 'ClasificadoresPractica'
                    ) THEN
                      ALTER TABLE ""Practicas""
                        ADD CONSTRAINT ""FK_Practicas_ClasificadorPracticaId""
                        FOREIGN KEY (""ClasificadorPracticaId"")
                        REFERENCES ""ClasificadoresPractica""(""Id"") ON DELETE SET NULL;
                    END IF;
                  END IF;
                END $$;
            ");

            // ── 4. Actualizar índice único (NomencladorId, Codigo) ───────────
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ""IX_Practicas_Codigo_NomencladorId"";
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Practicas_NomencladorId_Codigo""
                    ON ""Practicas"" (""NomencladorId"", ""Codigo"");
            ");

            // ── 5. Crear tabla PracticaConceptoUnidades ──────────────────────
            // Las FKs a ConceptoMaestro y UnidadesArancel se agregan de forma
            // condicional (DO $$) para evitar fallos si esas tablas no existen aún.
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""PracticaConceptoUnidades"" (
                    ""Id""                SERIAL          PRIMARY KEY,
                    ""PracticaId""        INT             NOT NULL
                        REFERENCES ""Practicas""(""Id"") ON DELETE CASCADE,
                    ""ConceptoMaestroId"" INT             NOT NULL,
                    ""UnidadArancelId""   INT             NOT NULL,
                    ""Unidades""          DECIMAL(10,4)   NOT NULL,
                    ""Cantidad""          DECIMAL(10,4)   NOT NULL,
                    ""VigenciaDesde""     TIMESTAMPTZ     NOT NULL,
                    ""VigenciaHasta""     TIMESTAMPTZ     NULL,
                    ""Activo""            BOOLEAN         NOT NULL DEFAULT TRUE,
                    ""CreatedAt""         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                    ""UpdatedAt""         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                    ""CreatedBy""         BIGINT          NULL,
                    ""UpdatedBy""         BIGINT          NULL
                );
                CREATE INDEX IF NOT EXISTS ""IX_PracticaConceptoUnidades_PracticaId""
                    ON ""PracticaConceptoUnidades"" (""PracticaId"");
                CREATE INDEX IF NOT EXISTS ""IX_PracticaConceptoUnidades_PracticaId_ConceptoMaestroId""
                    ON ""PracticaConceptoUnidades"" (""PracticaId"", ""ConceptoMaestroId"");
            ");

            // Agregar FKs a ConceptoMaestro y UnidadesArancel condicionalmente
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ConceptoMaestro')
                     AND NOT EXISTS (
                       SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_PracticaConceptoUnidades_ConceptoMaestro'
                     ) THEN
                    ALTER TABLE ""PracticaConceptoUnidades""
                      ADD CONSTRAINT ""FK_PracticaConceptoUnidades_ConceptoMaestro""
                      FOREIGN KEY (""ConceptoMaestroId"")
                      REFERENCES ""ConceptoMaestro""(""Id"") ON DELETE RESTRICT;
                  END IF;
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UnidadesArancel')
                     AND NOT EXISTS (
                       SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_PracticaConceptoUnidades_UnidadArancel'
                     ) THEN
                    ALTER TABLE ""PracticaConceptoUnidades""
                      ADD CONSTRAINT ""FK_PracticaConceptoUnidades_UnidadArancel""
                      FOREIGN KEY (""UnidadArancelId"")
                      REFERENCES ""UnidadesArancel""(""Id"") ON DELETE RESTRICT;
                  END IF;
                END $$;
            ");

            // ── 6. Crear tabla PracticaAuditLogs ─────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""PracticaAuditLogs"" (
                    ""Id""                       BIGSERIAL       PRIMARY KEY,
                    ""PracticaId""               INT             NOT NULL
                        REFERENCES ""Practicas""(""Id"") ON DELETE CASCADE,
                    ""PracticaConceptoUnidadId"" INT             NULL,
                    ""Accion""                   VARCHAR(30)     NOT NULL,
                    ""Entidad""                  VARCHAR(30)     NOT NULL,
                    ""FechaEvento""              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                    ""UsuarioId""                BIGINT          NULL,
                    ""UsuarioNombre""            VARCHAR(120)    NOT NULL DEFAULT '',
                    ""Origen""                   VARCHAR(30)     NOT NULL DEFAULT 'MANUAL',
                    ""TransactionId""            UUID            NULL,
                    ""DatosAnteriores""          TEXT            NULL,
                    ""DatosNuevos""              TEXT            NULL
                );
                CREATE INDEX IF NOT EXISTS ""IX_PracticaAuditLogs_PracticaId""
                    ON ""PracticaAuditLogs"" (""PracticaId"");
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Eliminar tablas nuevas
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""PracticaAuditLogs"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""PracticaConceptoUnidades"";");

            // No revertimos los ALTER TABLE de Practicas para evitar pérdida de datos.
            // Si se necesita revertir completamente, hacerlo manualmente.
        }
    }
}
