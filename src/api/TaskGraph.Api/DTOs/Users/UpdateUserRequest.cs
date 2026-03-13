namespace TaskGraph.Api.DTOs.Users;

public record UpdateUserRequest(
    string FirstName,
    string LastName,
    string Email
);
