using ConciCarpinella.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <summary>
    /// Migra las FKs de Practicas y Traductores desde la tabla Nomencladores (legado)
    /// hacia NomencladorMaestro. Luego elimina la tabla Nomencladores y su controlador.
    ///
    /// Usa SQL idempotente (IF EXISTS / IF NOT EXISTS / DO $$ BEGIN ... END $$)
    /// para poder aplicarse aunque el schema ya tenga cambios parciales.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260403100000_MigrarNomencladorAMaestro")]
    public partial class MigrarNomencladorAMaestro : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Practicas: redirigir FK NomencladorId → NomencladorMaestro ──
            migrationBuilder.Sql(@"
                -- Eliminar FK vieja (si existe) apuntando a Nomencladores
                DO $$ BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Practicas_Nomencladores_NomencladorId'
                      AND table_name = 'Practicas'
                  ) THEN
                    ALTER TABLE ""Practicas""
                      DROP CONSTRAINT ""FK_Practicas_Nomencladores_NomencladorId"";
                  END IF;
                END $$;

                -- Eliminar índice único (NomencladorId, Codigo) si existe
                DROP INDEX IF EXISTS ""IX_Practicas_NomencladorId_Codigo"";

                -- Obtener el ID del primer NomencladorMaestro activo para reasignar
                -- registros huérfanos (Practicas cuyo NomencladorId no existe en NomencladorMaestro)
                DO $$ DECLARE v_nomId INT;
                BEGIN
                  SELECT ""Id"" INTO v_nomId FROM ""NomencladorMaestro"" WHERE ""Activo"" = TRUE LIMIT 1;
                  IF v_nomId IS NOT NULL THEN
                    UPDATE ""Practicas""
                       SET ""NomencladorId"" = v_nomId
                     WHERE ""NomencladorId"" NOT IN (SELECT ""Id"" FROM ""NomencladorMaestro"");
                  END IF;
                END $$;

                -- Crear nueva FK apuntando a NomencladorMaestro
                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Practicas_NomencladorMaestro_NomencladorId'
                      AND table_name = 'Practicas'
                  ) THEN
                    ALTER TABLE ""Practicas""
                      ADD CONSTRAINT ""FK_Practicas_NomencladorMaestro_NomencladorId""
                      FOREIGN KEY (""NomencladorId"")
                      REFERENCES ""NomencladorMaestro""(""Id"")
                      ON DELETE RESTRICT;
                  END IF;
                END $$;

                -- Recrear índice único (NomencladorId, Codigo)
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Practicas_NomencladorId_Codigo""
                  ON ""Practicas""(""NomencladorId"", ""Codigo"");
            ");

            // ── 2. Traductores: redirigir FKs NomencladorOrigenId / NomencladorDestinoId ──
            migrationBuilder.Sql(@"
                -- Eliminar FKs viejas de Traductores apuntando a Nomencladores
                DO $$ BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Traductores_Nomencladores_NomencladorOrigenId'
                      AND table_name = 'Traductores'
                  ) THEN
                    ALTER TABLE ""Traductores""
                      DROP CONSTRAINT ""FK_Traductores_Nomencladores_NomencladorOrigenId"";
                  END IF;
                END $$;

                DO $$ BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Traductores_Nomencladores_NomencladorDestinoId'
                      AND table_name = 'Traductores'
                  ) THEN
                    ALTER TABLE ""Traductores""
                      DROP CONSTRAINT ""FK_Traductores_Nomencladores_NomencladorDestinoId"";
                  END IF;
                END $$;

                -- Reasignar Traductores huérfanos al primer NomencladorMaestro activo
                DO $$ DECLARE v_nomId INT;
                BEGIN
                  SELECT ""Id"" INTO v_nomId FROM ""NomencladorMaestro"" WHERE ""Activo"" = TRUE LIMIT 1;
                  IF v_nomId IS NOT NULL THEN
                    UPDATE ""Traductores""
                       SET ""NomencladorOrigenId"" = v_nomId
                     WHERE ""NomencladorOrigenId"" NOT IN (SELECT ""Id"" FROM ""NomencladorMaestro"");
                    UPDATE ""Traductores""
                       SET ""NomencladorDestinoId"" = v_nomId
                     WHERE ""NomencladorDestinoId"" NOT IN (SELECT ""Id"" FROM ""NomencladorMaestro"");
                  END IF;
                END $$;

                -- Crear nuevas FKs apuntando a NomencladorMaestro
                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Traductores_NomencladorMaestro_NomencladorOrigenId'
                      AND table_name = 'Traductores'
                  ) THEN
                    ALTER TABLE ""Traductores""
                      ADD CONSTRAINT ""FK_Traductores_NomencladorMaestro_NomencladorOrigenId""
                      FOREIGN KEY (""NomencladorOrigenId"")
                      REFERENCES ""NomencladorMaestro""(""Id"")
                      ON DELETE NO ACTION;
                  END IF;
                END $$;

                DO $$ BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_Traductores_NomencladorMaestro_NomencladorDestinoId'
                      AND table_name = 'Traductores'
                  ) THEN
                    ALTER TABLE ""Traductores""
                      ADD CONSTRAINT ""FK_Traductores_NomencladorMaestro_NomencladorDestinoId""
                      FOREIGN KEY (""NomencladorDestinoId"")
                      REFERENCES ""NomencladorMaestro""(""Id"")
                      ON DELETE NO ACTION;
                  END IF;
                END $$;
            ");

            // ── 3. Eliminar tabla Nomencladores (legado) ──────────────────────
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS ""Nomencladores"";
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Recrear tabla Nomencladores legado
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Nomencladores"" (
                    ""Id""           SERIAL PRIMARY KEY,
                    ""Nombre""       VARCHAR(100) NOT NULL,
                    ""Version""      VARCHAR(50)  NOT NULL DEFAULT '',
                    ""Descripcion""  VARCHAR(500),
                    ""Activo""       BOOLEAN      NOT NULL DEFAULT TRUE,
                    ""FechaCreacion"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                -- Insertar un registro genérico para que las FKs no fallen
                INSERT INTO ""Nomencladores""(""Nombre"", ""Version"", ""Activo"")
                VALUES ('Legado', 'Restaurado', TRUE)
                ON CONFLICT DO NOTHING;
            ");

            // Nota: no se restauran las FKs apuntando a la tabla legado
            // ya que el rollback completo requeriría conocer los IDs originales.
        }
    }
}
