using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <inheritdoc />
    public partial class NormasOperativas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NormaOpAuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NormaId = table.Column<int>(type: "integer", nullable: false),
                    Campo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Seccion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ValorAnterior = table.Column<string>(type: "text", nullable: true),
                    ValorNuevo = table.Column<string>(type: "text", nullable: true),
                    UsuarioNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NormaOpAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NormaOpOpciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Categoria = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NormaOpOpciones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NormasOperativas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ObraSocialId = table.Column<int>(type: "integer", nullable: true),
                    NombreOs = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CodigoOs = table.Column<int>(type: "integer", nullable: true),
                    LinkDrive = table.Column<string>(type: "text", nullable: true),
                    Coseguros = table.Column<string>(type: "text", nullable: true),
                    TipoOrdenId = table.Column<int>(type: "integer", nullable: true),
                    VigenciaOrdenId = table.Column<int>(type: "integer", nullable: true),
                    FechaCalculoVigenciaId = table.Column<int>(type: "integer", nullable: true),
                    AceptaPedidoDigitalPreimpreso = table.Column<string>(type: "text", nullable: true),
                    AceptaPedidoFirmaDigital = table.Column<bool>(type: "boolean", nullable: true),
                    RequiereAutorizacionExpresa = table.Column<string>(type: "text", nullable: true),
                    AceptaRpDigital = table.Column<string>(type: "text", nullable: true),
                    TipoAutorizacion = table.Column<string>(type: "text", nullable: true),
                    FormatoAutorizacion = table.Column<string>(type: "text", nullable: true),
                    AceptaFotocopiaRp = table.Column<string>(type: "text", nullable: true),
                    CarnetDiscapacidadOncologico = table.Column<string>(type: "text", nullable: true),
                    PaginaObraSocial = table.Column<string>(type: "text", nullable: true),
                    Usuario = table.Column<string>(type: "text", nullable: true),
                    Contrasena = table.Column<string>(type: "text", nullable: true),
                    LinkInstructivo = table.Column<string>(type: "text", nullable: true),
                    FechaAutorizacion = table.Column<string>(type: "text", nullable: true),
                    MedicoNoAparece = table.Column<string>(type: "text", nullable: true),
                    EfectorImagenId = table.Column<int>(type: "integer", nullable: true),
                    EfectorConsultasId = table.Column<int>(type: "integer", nullable: true),
                    EfectorOftalmologiaId = table.Column<int>(type: "integer", nullable: true),
                    EfectorOtrasId = table.Column<int>(type: "integer", nullable: true),
                    EfectorNoAparece = table.Column<string>(type: "text", nullable: true),
                    Anestesias = table.Column<string>(type: "text", nullable: true),
                    AnatomiaPatologica = table.Column<string>(type: "text", nullable: true),
                    Cirugia = table.Column<string>(type: "text", nullable: true),
                    EstudiosValorCeroId = table.Column<int>(type: "integer", nullable: true),
                    ObservacionesAutorizaciones = table.Column<string>(type: "text", nullable: true),
                    HorarioObraSocial = table.Column<string>(type: "text", nullable: true),
                    FechaFacturacionId = table.Column<int>(type: "integer", nullable: true),
                    DocumentacionId = table.Column<int>(type: "integer", nullable: true),
                    ModoCierreId = table.Column<int>(type: "integer", nullable: true),
                    CopiasFacturasId = table.Column<int>(type: "integer", nullable: true),
                    DireccionEntregaId = table.Column<int>(type: "integer", nullable: true),
                    ContactoFacturacionId = table.Column<int>(type: "integer", nullable: true),
                    SoporteMagnetico = table.Column<bool>(type: "boolean", nullable: true),
                    LibreDeDeuda = table.Column<bool>(type: "boolean", nullable: true),
                    TroquelContrastes = table.Column<bool>(type: "boolean", nullable: true),
                    LaboratorioFacturaId = table.Column<int>(type: "integer", nullable: true),
                    InformacionAdicional = table.Column<string>(type: "text", nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaUltimaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreadoPor = table.Column<string>(type: "text", nullable: true),
                    ModificadoPor = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NormasOperativas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_ContactoFacturacionId",
                        column: x => x.ContactoFacturacionId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_CopiasFacturasId",
                        column: x => x.CopiasFacturasId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_DireccionEntregaId",
                        column: x => x.DireccionEntregaId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_DocumentacionId",
                        column: x => x.DocumentacionId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_EfectorConsultasId",
                        column: x => x.EfectorConsultasId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_EfectorImagenId",
                        column: x => x.EfectorImagenId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_EfectorOftalmologiaId",
                        column: x => x.EfectorOftalmologiaId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_EfectorOtrasId",
                        column: x => x.EfectorOtrasId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_EstudiosValorCeroId",
                        column: x => x.EstudiosValorCeroId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_FechaCalculoVigenciaId",
                        column: x => x.FechaCalculoVigenciaId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_FechaFacturacionId",
                        column: x => x.FechaFacturacionId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_LaboratorioFacturaId",
                        column: x => x.LaboratorioFacturaId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_ModoCierreId",
                        column: x => x.ModoCierreId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_TipoOrdenId",
                        column: x => x.TipoOrdenId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_NormaOpOpciones_VigenciaOrdenId",
                        column: x => x.VigenciaOrdenId,
                        principalTable: "NormaOpOpciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NormasOperativas_ObrasSociales_ObraSocialId",
                        column: x => x.ObraSocialId,
                        principalTable: "ObrasSociales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NormaOpAuditLogs_NormaId",
                table: "NormaOpAuditLogs",
                column: "NormaId");

            migrationBuilder.CreateIndex(
                name: "IX_NormaOpOpciones_Categoria",
                table: "NormaOpOpciones",
                column: "Categoria");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_ContactoFacturacionId",
                table: "NormasOperativas",
                column: "ContactoFacturacionId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_CopiasFacturasId",
                table: "NormasOperativas",
                column: "CopiasFacturasId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_DireccionEntregaId",
                table: "NormasOperativas",
                column: "DireccionEntregaId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_DocumentacionId",
                table: "NormasOperativas",
                column: "DocumentacionId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_EfectorConsultasId",
                table: "NormasOperativas",
                column: "EfectorConsultasId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_EfectorImagenId",
                table: "NormasOperativas",
                column: "EfectorImagenId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_EfectorOftalmologiaId",
                table: "NormasOperativas",
                column: "EfectorOftalmologiaId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_EfectorOtrasId",
                table: "NormasOperativas",
                column: "EfectorOtrasId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_EstudiosValorCeroId",
                table: "NormasOperativas",
                column: "EstudiosValorCeroId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_FechaCalculoVigenciaId",
                table: "NormasOperativas",
                column: "FechaCalculoVigenciaId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_FechaFacturacionId",
                table: "NormasOperativas",
                column: "FechaFacturacionId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_LaboratorioFacturaId",
                table: "NormasOperativas",
                column: "LaboratorioFacturaId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_ModoCierreId",
                table: "NormasOperativas",
                column: "ModoCierreId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_ObraSocialId",
                table: "NormasOperativas",
                column: "ObraSocialId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_TipoOrdenId",
                table: "NormasOperativas",
                column: "TipoOrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_NormasOperativas_VigenciaOrdenId",
                table: "NormasOperativas",
                column: "VigenciaOrdenId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NormaOpAuditLogs");

            migrationBuilder.DropTable(
                name: "NormasOperativas");

            migrationBuilder.DropTable(
                name: "NormaOpOpciones");
        }
    }
}
