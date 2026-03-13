namespace TaskGraph.Api.DTOs.Notifications;

public record NotificationResponse(
    Guid Id,
    string Type,
    Guid? TaskId,
    string? TaskTitle,
    string Message,
    bool IsRead,
    DateTime CreatedAt
);
