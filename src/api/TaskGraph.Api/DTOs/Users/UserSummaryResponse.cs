namespace TaskGraph.Api.DTOs.Users;

public record UserSummaryResponse(
    Guid Id,
    string Username,
    string FirstName,
    string LastName,
    string Email,
    string? AvatarUrl,
    TaskCountSummary TaskCounts
);
