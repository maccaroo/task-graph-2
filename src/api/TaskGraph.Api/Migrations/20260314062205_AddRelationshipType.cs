using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGraph.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationshipType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RelationshipType",
                table: "TaskRelationships",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RelationshipType",
                table: "TaskRelationships");
        }
    }
}
