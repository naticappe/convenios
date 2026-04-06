using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUnidadArancel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UnidadesArancel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    VigenciaDesde = table.Column<DateOnly>(type: "date", nullable: false),
                    VigenciaHasta = table.Column<DateOnly>(type: "date", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnidadesArancel", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UnidadesArancelAuditLog",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UnidadArancelId = table.Column<int>(type: "integer", nullable: false),
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
                    DatosAnteriores = table.Column<string>(type: "text", nullable: true),
                    DatosNuevos = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnidadesArancelAuditLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UnidadesArancelAuditLog_UnidadesArancel_UnidadArancelId",
                        column: x => x.UnidadArancelId,
                        principalTable: "UnidadesArancel",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UnidadesArancel_Nombre",
                table: "UnidadesArancel",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UnidadesArancelAuditLog_UnidadArancelId",
                table: "UnidadesArancelAuditLog",
                column: "UnidadArancelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UnidadesArancelAuditLog");
            migrationBuilder.DropTable(name: "UnidadesArancel");
        }
    }
}
