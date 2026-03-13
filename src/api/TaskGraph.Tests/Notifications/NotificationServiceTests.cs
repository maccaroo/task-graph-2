using Microsoft.EntityFrameworkCore;
using Moq;
using TaskGraph.Api.Data;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;
using TaskGraph.Api.Services;

namespace TaskGraph.Tests.Notifications;

public class NotificationServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (NotificationService service, AppDbContext db) CreateService()
    {
        var db = CreateDb();
        var manager = new Mock<IWebSocketConnectionManager>();
        manager.Setup(m => m.BroadcastToUserAsync(It.IsAny<Guid>(), It.IsAny<object>()))
            .Returns(Task.CompletedTask);
        return (new NotificationService(db, manager.Object), db);
    }

    private static async Task<User> SeedUser(AppDbContext db)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = Guid.NewGuid().ToString("N"),
            FirstName = "Test",
            LastName = "User",
            Email = $"{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<Notification> SeedNotification(AppDbContext db, Guid userId,
        bool isRead = false, string message = "Test notification")
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = NotificationType.AssignmentAlert,
            Message = message,
            IsRead = isRead
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
        return notification;
    }

    // --- GetAllForUserAsync ---

    [Fact]
    public async Task GetAll_ReturnsOnlyUserNotifications()
    {
        var (service, db) = CreateService();
        var user1 = await SeedUser(db);
        var user2 = await SeedUser(db);
        await SeedNotification(db, user1.Id);
        await SeedNotification(db, user1.Id);
        await SeedNotification(db, user2.Id);

        var result = (await service.GetAllForUserAsync(user1.Id)).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAll_ReturnsOrderedByCreatedAtDescending()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);
        var n1 = await SeedNotification(db, user.Id, message: "first");
        var n2 = await SeedNotification(db, user.Id, message: "second");
        // Manually set CreatedAt to ensure ordering
        n1.CreatedAt = DateTime.UtcNow.AddMinutes(-5);
        n2.CreatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var result = (await service.GetAllForUserAsync(user.Id)).ToList();

        Assert.Equal(n2.Id, result[0].Id);
        Assert.Equal(n1.Id, result[1].Id);
    }

    [Fact]
    public async Task GetAll_EmptyForUserWithNoNotifications()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        var result = await service.GetAllForUserAsync(user.Id);

        Assert.Empty(result);
    }

    // --- MarkAsReadAsync ---

    [Fact]
    public async Task MarkAsRead_SetsIsReadTrue()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);
        var notification = await SeedNotification(db, user.Id);

        var result = await service.MarkAsReadAsync(notification.Id, user.Id);

        Assert.True(result.IsRead);
    }

    [Fact]
    public async Task MarkAsRead_UnknownId_ThrowsNotFound()
    {
        var (service, _) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.MarkAsReadAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public async Task MarkAsRead_DifferentRequester_ThrowsUnauthorized()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);
        var notification = await SeedNotification(db, user.Id);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.MarkAsReadAsync(notification.Id, Guid.NewGuid()));
    }

    // --- CreateAsync ---

    [Fact]
    public async Task Create_SavesNotificationToDb()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await service.CreateAsync(user.Id, NotificationType.AssignmentAlert, null, "You were assigned");

        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == user.Id);
        Assert.NotNull(notification);
        Assert.Equal("You were assigned", notification.Message);
        Assert.False(notification.IsRead);
    }

    [Fact]
    public async Task Create_BroadcastsToConnectionManager()
    {
        var db = CreateDb();
        var manager = new Mock<IWebSocketConnectionManager>();
        manager.Setup(m => m.BroadcastToUserAsync(It.IsAny<Guid>(), It.IsAny<object>()))
            .Returns(Task.CompletedTask);
        var service = new NotificationService(db, manager.Object);
        var user = await SeedUser(db);

        await service.CreateAsync(user.Id, NotificationType.AssignmentAlert, null, "msg");

        manager.Verify(m => m.BroadcastToUserAsync(user.Id, It.IsAny<object>()), Times.Once);
    }
}
