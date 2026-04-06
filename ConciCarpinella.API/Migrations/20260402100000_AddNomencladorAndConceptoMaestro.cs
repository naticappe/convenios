using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNomencladorAndConceptoMaestro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── NomencladorMaestro ─────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "NomencladorMaestro",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    VigenciaDesde = table.Column<DateOnly>(type: "date", nullable: false),
                    VigenciaHasta = table.Column<DateOnly>(type: "date", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NomencladorMaestro", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NomencladorMaestro_Nombre",
                table: "NomencladorMaestro",
                column: "Nombre",
                unique: true);

            // ── NomencladorMaestroAuditLog ─────────────────────────────────
            migrationBuilder.CreateTable(
                name: "NomencladorMaestroAuditLog",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NomencladorMaestroId = table.Column<int>(type: "integer", nullable: false),
                    Accion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    FechaEvento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsuarioId = table.Column<long>(type: "bigint", nullable: true),
                    UsuarioNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Origen = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    NombreAnterior = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    VigenciaDesdeAnterior = table.Column<DateOnly>(type: "date", nullable: true),
                    VigenciaHastaAnterior = table.Column<DateOnly>(type: "date", nullable: true),
                    ActivoAnterior = table.Column<bool>(type: "boolean", nullable: true),
                    NombreNuevo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    VigenciaDesdeNuevo = table.Column<DateOnly>(type: "date", nullable: true),
                    VigenciaHastaNuevo = table.Column<DateOnly>(type: "date", nullable: true),
                    ActivoNuevo = table.Column<bool>(type: "boolean", nullable: true),
                    DatosAnteriores = table.Column<string>(type: "jsonb", nullable: true),
                    DatosNuevos = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NomencladorMaestroAuditLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NomencladorMaestroAuditLog_NomencladorMaestro",
                        column: x => x.NomencladorMaestroId,
                        principalTable: "NomencladorMaestro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NomencladorMaestroAuditLog_NomencladorMaestroId",
                table: "NomencladorMaestroAuditLog",
                column: "NomencladorMaestroId");

            // ── ConceptoMaestro ────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "ConceptoMaestro",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Sigla = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    VigenciaDesde = table.Column<DateOnly>(type: "date", nullable: false),
                    VigenciaHasta = table.Column<DateOnly>(type: "date", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConceptoMaestro", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConceptoMaestro_Nombre",
                table: "ConceptoMaestro",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConceptoMaestro_Sigla",
                table: "ConceptoMaestro",
                column: "Sigla",
                unique: true);

            // ── ConceptoMaestroAuditLog ────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "ConceptoMaestroAuditLog",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConceptoMaestroId = table.Column<int>(type: "integer", nullable: false),
                    Accion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    FechaEvento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsuarioId = table.Column<long>(type: "bigint", nullable: true),
                    UsuarioNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Origen = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    NombreAnterior = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    SiglaAnterior = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    VigenciaDesdeAnterior = table.Column<DateOnly>(type: "date", nullable: true),
                    VigenciaHastaAnterior = table.Column<DateOnly>(type: "date", nullable: true),
                    ActivoAnterior = table.Column<bool>(type: "boolean", nullable: true),
                    NombreNuevo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    SiglaNueva = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    VigenciaDesdeNuevo = table.Column<DateOnly>(type: "date", nullable: true),
                    VigenciaHastaNuevo = table.Column<DateOnly>(type: "date", nullable: true),
                    ActivoNuevo = table.Column<bool>(type: "boolean", nullable: true),
                    DatosAnteriores = table.Column<string>(type: "jsonb", nullable: true),
                    DatosNuevos = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConceptoMaestroAuditLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConceptoMaestroAuditLog_ConceptoMaestro",
                        column: x => x.ConceptoMaestroId,
                        principalTable: "ConceptoMaestro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConceptoMaestroAuditLog_ConceptoMaestroId",
                table: "ConceptoMaestroAuditLog",
                column: "ConceptoMaestroId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ConceptoMaestroAuditLog");
            migrationBuilder.DropTable(name: "ConceptoMaestro");
            migrationBuilder.DropTable(name: "NomencladorMaestroAuditLog");
            migrationBuilder.DropTable(name: "NomencladorMaestro");
        }
    }
}
