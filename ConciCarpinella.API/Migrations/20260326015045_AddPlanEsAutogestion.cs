using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConciCarpinella.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanEsAutogestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsAutogestion",
                table: "Planes",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsAutogestion",
                table: "Planes");
        }
    }
}
