using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Auth;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Services;

namespace TaskGraph.Tests.Auth;

public class AuthServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "test_secret_key_that_is_at_least_32_chars!!",
                ["Jwt:Issuer"] = "taskgraph",
                ["Jwt:Audience"] = "taskgraph",
                ["Jwt:ExpiryMinutes"] = "60"
            })
            .Build();

    private static AuthService CreateService(AppDbContext db) =>
        new(db, CreateConfig());

    // --- RegisterAsync ---

    [Fact]
    public async Task Register_ValidRequest_ReturnsToken()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        var result = await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Equal(1, await db.Users.CountAsync());
    }

    [Fact]
    public async Task Register_StoresHashedPassword()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        var user = await db.Users.SingleAsync();
        Assert.NotEqual("password123", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", user.PasswordHash));
    }

    [Fact]
    public async Task Register_DuplicateUsername_ThrowsConflict()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(
            new RegisterRequest("alice", "Alice", "Jones", "alice2@example.com", "password123")));
    }

    [Fact]
    public async Task Register_DuplicateEmail_ThrowsConflict()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(
            new RegisterRequest("bob", "Bob", "Jones", "alice@example.com", "password123")));
    }

    [Theory]
    [InlineData("", "Alice", "Smith", "alice@example.com", "password123")]
    [InlineData("alice", "", "Smith", "alice@example.com", "password123")]
    [InlineData("alice", "Alice", "", "alice@example.com", "password123")]
    [InlineData("alice", "Alice", "Smith", "", "password123")]
    public async Task Register_BlankRequiredField_ThrowsValidation(
        string username, string firstName, string lastName, string email, string password)
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(
            new RegisterRequest(username, firstName, lastName, email, password)));
    }

    [Fact]
    public async Task Register_InvalidEmail_ThrowsValidation()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(
            new RegisterRequest("alice", "Alice", "Smith", "not-an-email", "password123")));
    }

    [Fact]
    public async Task Register_ShortPassword_ThrowsValidation()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(
            new RegisterRequest("alice", "Alice", "Smith", "alice@example.com", "short")));
    }

    // --- LoginAsync ---

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        var result = await service.LoginAsync(new LoginRequest("alice", "password123"));

        Assert.False(string.IsNullOrWhiteSpace(result.Token));
    }

    [Fact]
    public async Task Login_UnknownUsername_ThrowsUnauthorized()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.LoginAsync(new LoginRequest("nobody", "password123")));
    }

    [Fact]
    public async Task Login_WrongPassword_ThrowsUnauthorized()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.LoginAsync(new LoginRequest("alice", "wrongpassword")));
    }

    // --- RequestPasswordResetAsync ---

    [Fact]
    public async Task RequestPasswordReset_ValidEmail_CreatesToken()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        var result = await service.RequestPasswordResetAsync(
            new PasswordResetRequestRequest("alice@example.com"));

        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Equal(1, await db.PasswordResetTokens.CountAsync());
    }

    [Fact]
    public async Task RequestPasswordReset_UnknownEmail_ThrowsNotFound()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.RequestPasswordResetAsync(new PasswordResetRequestRequest("nobody@example.com")));
    }

    [Fact]
    public async Task RequestPasswordReset_SecondRequest_ReplacesExistingToken()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        await service.RequestPasswordResetAsync(new PasswordResetRequestRequest("alice@example.com"));
        await service.RequestPasswordResetAsync(new PasswordResetRequestRequest("alice@example.com"));

        Assert.Equal(1, await db.PasswordResetTokens.CountAsync());
    }

    // --- ResetPasswordAsync ---

    [Fact]
    public async Task ResetPassword_ValidToken_UpdatesPassword()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));
        var resetResponse = await service.RequestPasswordResetAsync(
            new PasswordResetRequestRequest("alice@example.com"));

        await service.ResetPasswordAsync(new PasswordResetConfirmRequest(resetResponse.Token, "newpassword99"));

        var loginResult = await service.LoginAsync(new LoginRequest("alice", "newpassword99"));
        Assert.False(string.IsNullOrWhiteSpace(loginResult.Token));
    }

    [Fact]
    public async Task ResetPassword_DeletesTokenAfterUse()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));
        var resetResponse = await service.RequestPasswordResetAsync(
            new PasswordResetRequestRequest("alice@example.com"));

        await service.ResetPasswordAsync(new PasswordResetConfirmRequest(resetResponse.Token, "newpassword99"));

        Assert.Equal(0, await db.PasswordResetTokens.CountAsync());
    }

    [Fact]
    public async Task ResetPassword_MalformedToken_ThrowsValidation()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ResetPasswordAsync(new PasswordResetConfirmRequest("not-a-guid", "newpassword99")));
    }

    [Fact]
    public async Task ResetPassword_UnknownToken_ThrowsNotFound()
    {
        using var db = CreateDb();
        var service = CreateService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.ResetPasswordAsync(new PasswordResetConfirmRequest(
                Guid.NewGuid().ToString(), "newpassword99")));
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_ThrowsUnauthorized()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));

        // Insert an already-expired token directly
        var user = await db.Users.SingleAsync();
        var expiredToken = new Api.Models.PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(-1)
        };
        db.PasswordResetTokens.Add(expiredToken);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            service.ResetPasswordAsync(new PasswordResetConfirmRequest(
                expiredToken.Id.ToString(), "newpassword99")));
    }

    [Fact]
    public async Task ResetPassword_ShortNewPassword_ThrowsValidation()
    {
        using var db = CreateDb();
        var service = CreateService(db);
        await service.RegisterAsync(new RegisterRequest(
            "alice", "Alice", "Smith", "alice@example.com", "password123"));
        var resetResponse = await service.RequestPasswordResetAsync(
            new PasswordResetRequestRequest("alice@example.com"));

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ResetPasswordAsync(new PasswordResetConfirmRequest(resetResponse.Token, "short")));
    }
}
