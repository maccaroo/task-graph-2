namespace TaskGraph.Api.DTOs.Auth;

public record RegisterRequest(
    string Username,
    string FirstName,
    string LastName,
    string Email,
    string Password
);
