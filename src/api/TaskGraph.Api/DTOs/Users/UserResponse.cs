namespace TaskGraph.Api.DTOs.Users;

public record UserResponse(
    Guid Id,
    string Username,
    string FirstName,
    string LastName,
    string Email,
    string? AvatarUrl
);
