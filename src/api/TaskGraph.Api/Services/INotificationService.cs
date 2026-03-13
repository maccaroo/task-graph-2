using TaskGraph.Api.DTOs.Notifications;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Services;

public interface INotificationService
{
    Task<IEnumerable<NotificationResponse>> GetAllForUserAsync(Guid userId);
    Task<NotificationResponse> MarkAsReadAsync(Guid id, Guid requesterId);
    Task CreateAsync(Guid userId, NotificationType type, Guid? taskId, string message);
}
