using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGraph.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemovePinnedPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PinnedPosition",
                table: "Tasks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PinnedPosition",
                table: "Tasks",
                type: "jsonb",
                nullable: true);
        }
    }
}
