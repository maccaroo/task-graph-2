namespace TaskGraph.Api.Models;

public class PasswordResetToken
{
    // Id doubles as the opaque reset token value sent to the client
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
}
