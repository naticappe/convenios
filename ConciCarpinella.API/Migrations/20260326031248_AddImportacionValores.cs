using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <inheritdoc />
    public partial class AddImportacionValores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportacionesValores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ObraSocialId = table.Column<int>(type: "integer", nullable: false),
                    NombreArchivo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VigenciaDesde = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Aplicada = table.Column<bool>(type: "boolean", nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportacionesValores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportacionesValores_ObrasSociales_ObraSocialId",
                        column: x => x.ObraSocialId,
                        principalTable: "ObrasSociales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportacionesValoresItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportacionId = table.Column<int>(type: "integer", nullable: false),
                    CodigoPractica = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CodigoExterno = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DescripcionPractica = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ValorImportado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportacionesValoresItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportacionesValoresItems_ImportacionesValores_ImportacionId",
                        column: x => x.ImportacionId,
                        principalTable: "ImportacionesValores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportacionesValores_ObraSocialId",
                table: "ImportacionesValores",
                column: "ObraSocialId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportacionesValoresItems_ImportacionId",
                table: "ImportacionesValoresItems",
                column: "ImportacionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportacionesValoresItems");

            migrationBuilder.DropTable(
                name: "ImportacionesValores");
        }
    }
}
