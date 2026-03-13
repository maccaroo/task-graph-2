namespace TaskGraph.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? AvatarUrl { get; set; }
    public UserConfiguration Configuration { get; set; } = new();
}
