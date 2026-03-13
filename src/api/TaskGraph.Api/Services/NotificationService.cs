using Microsoft.EntityFrameworkCore;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Notifications;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Services;

public class NotificationService(AppDbContext db, IWebSocketConnectionManager connectionManager) : INotificationService
{
    public async Task<IEnumerable<NotificationResponse>> GetAllForUserAsync(Guid userId)
    {
        var notifications = await db.Notifications
            .Include(n => n.Task)
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(ToResponse);
    }

    public async Task<NotificationResponse> MarkAsReadAsync(Guid id, Guid requesterId)
    {
        var notification = await db.Notifications
            .Include(n => n.Task)
            .FirstOrDefaultAsync(n => n.Id == id)
            ?? throw new NotFoundException($"Notification {id} not found.");

        if (notification.UserId != requesterId)
            throw new UnauthorizedException("You can only mark your own notifications as read.");

        notification.IsRead = true;
        await db.SaveChangesAsync();
        return ToResponse(notification);
    }

    public async Task CreateAsync(Guid userId, NotificationType type, Guid? taskId, string message)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            TaskId = taskId,
            Message = message
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        if (taskId.HasValue)
            await db.Entry(notification).Reference(n => n.Task).LoadAsync();

        await connectionManager.BroadcastToUserAsync(userId, new
        {
            @event = "notification",
            data = ToResponse(notification)
        });
    }

    private static NotificationResponse ToResponse(Notification n) => new(
        n.Id,
        n.Type.ToString(),
        n.TaskId,
        n.Task?.Title,
        n.Message,
        n.IsRead,
        n.CreatedAt
    );
}
