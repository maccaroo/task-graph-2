using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Users;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;
using TaskGraph.Api.Services;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Tests.Users;

public class UserServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (UserService service, AppDbContext db) CreateService(string? webRootPath = null)
    {
        var db = CreateDb();
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.WebRootPath).Returns(webRootPath ?? Path.GetTempPath());
        return (new UserService(db, env.Object), db);
    }

    private static async Task<User> SeedUser(AppDbContext db, string username = "alice",
        string email = "alice@example.com")
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            FirstName = "Alice",
            LastName = "Smith",
            Email = email,
            PasswordHash = "hash"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAll_ReturnsAllUsers()
    {
        var (service, db) = CreateService();
        await SeedUser(db, "alice", "alice@example.com");
        await SeedUser(db, "bob", "bob@example.com");

        var result = (await service.GetAllAsync()).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAll_IncludesTaskCountSummary()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);
        db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), Title = "T1", AssigneeId = user.Id, Status = TaskStatus.Complete });
        db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), Title = "T2", AssigneeId = user.Id, Status = TaskStatus.Incomplete });
        db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), Title = "T3", AssigneeId = user.Id, Status = TaskStatus.Incomplete });
        await db.SaveChangesAsync();

        var result = (await service.GetAllAsync()).Single();

        Assert.Equal(3, result.TaskCounts.Total);
        Assert.Equal(1, result.TaskCounts.Complete);
        Assert.Equal(2, result.TaskCounts.Incomplete);
    }

    [Fact]
    public async Task GetAll_UserWithNoTasks_HasZeroCounts()
    {
        var (service, db) = CreateService();
        await SeedUser(db);

        var result = (await service.GetAllAsync()).Single();

        Assert.Equal(0, result.TaskCounts.Total);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetById_ExistingUser_ReturnsUser()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        var result = await service.GetByIdAsync(user.Id);

        Assert.Equal(user.Id, result.Id);
        Assert.Equal("alice", result.Username);
    }

    [Fact]
    public async Task GetById_UnknownId_ThrowsNotFound()
    {
        var (service, _) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.GetByIdAsync(Guid.NewGuid()));
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task Update_ValidRequest_UpdatesFields()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        var result = await service.UpdateAsync(user.Id, user.Id, new UpdateUserRequest(
            "Bob", "Jones", "bob@example.com"));

        Assert.Equal("Bob", result.FirstName);
        Assert.Equal("Jones", result.LastName);
        Assert.Equal("bob@example.com", result.Email);
    }

    [Fact]
    public async Task Update_DifferentRequester_ThrowsUnauthorized()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.UpdateAsync(user.Id, Guid.NewGuid(), new UpdateUserRequest(
                "Bob", "Jones", "bob@example.com")));
    }

    [Fact]
    public async Task Update_DuplicateEmail_ThrowsConflict()
    {
        var (service, db) = CreateService();
        var alice = await SeedUser(db, "alice", "alice@example.com");
        await SeedUser(db, "bob", "bob@example.com");

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.UpdateAsync(alice.Id, alice.Id, new UpdateUserRequest(
                "Alice", "Smith", "bob@example.com")));
    }

    [Theory]
    [InlineData("", "Smith", "alice@example.com")]
    [InlineData("Alice", "", "alice@example.com")]
    [InlineData("Alice", "Smith", "")]
    public async Task Update_BlankField_ThrowsValidation(
        string firstName, string lastName, string email)
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateAsync(user.Id, user.Id, new UpdateUserRequest(firstName, lastName, email)));
    }

    [Fact]
    public async Task Update_InvalidEmail_ThrowsValidation()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateAsync(user.Id, user.Id, new UpdateUserRequest(
                "Alice", "Smith", "not-an-email")));
    }

    [Fact]
    public async Task Update_UnknownUser_ThrowsNotFound()
    {
        var (service, _) = CreateService();
        var randomId = Guid.NewGuid();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.UpdateAsync(randomId, randomId, new UpdateUserRequest(
                "Alice", "Smith", "alice@example.com")));
    }

    // --- UpdateAvatarAsync ---

    [Fact]
    public async Task UpdateAvatar_FileTooLarge_ThrowsValidation()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateAvatarAsync(user.Id, user.Id, Stream.Null, "photo.jpg",
                11 * 1024 * 1024, null));
    }

    [Fact]
    public async Task UpdateAvatar_DifferentRequester_ThrowsUnauthorized()
    {
        var (service, db) = CreateService();
        var user = await SeedUser(db);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.UpdateAvatarAsync(user.Id, Guid.NewGuid(), Stream.Null, "photo.jpg", 100, null));
    }
}
