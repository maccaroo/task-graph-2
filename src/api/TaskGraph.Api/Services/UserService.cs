using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Users;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Services;

public class UserService(AppDbContext db, IWebHostEnvironment env) : IUserService
{
    private const long MaxAvatarBytes = 10 * 1024 * 1024; // 10 MB
    private const int AvatarSizePx = 256;

    public async Task<IEnumerable<UserSummaryResponse>> GetAllAsync()
    {
        var users = await db.Users.ToListAsync();
        var taskCounts = await db.Tasks
            .GroupBy(t => new { t.AssigneeId, t.Status })
            .Select(g => new { g.Key.AssigneeId, g.Key.Status, Count = g.Count() })
            .ToListAsync();

        return users.Select(u =>
        {
            var counts = taskCounts.Where(c => c.AssigneeId == u.Id).ToList();
            var complete = counts.Where(c => c.Status == TaskStatus.Complete).Sum(c => c.Count);
            var incomplete = counts.Where(c => c.Status == TaskStatus.Incomplete).Sum(c => c.Count);
            return new UserSummaryResponse(
                u.Id, u.Username, u.FirstName, u.LastName, u.Email, u.AvatarUrl,
                new TaskCountSummary(complete + incomplete, complete, incomplete));
        });
    }

    public async Task<UserResponse> GetByIdAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id)
            ?? throw new NotFoundException($"User {id} not found.");
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateAsync(Guid id, Guid requesterId, UpdateUserRequest request)
    {
        if (id != requesterId)
            throw new UnauthorizedException("You can only update your own profile.");

        var user = await db.Users.FindAsync(id)
            ?? throw new NotFoundException($"User {id} not found.");

        if (string.IsNullOrWhiteSpace(request.FirstName))
            throw new ValidationException("FirstName is required.");
        if (string.IsNullOrWhiteSpace(request.LastName))
            throw new ValidationException("LastName is required.");
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ValidationException("Email is required.");

        ValidateEmail(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id))
            throw new ConflictException("Email already registered.");

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;

        await db.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateAvatarAsync(
        Guid id, Guid requesterId, Stream imageStream, string fileName, long fileSize, AvatarCrop? crop)
    {
        if (id != requesterId)
            throw new UnauthorizedException("You can only update your own avatar.");

        if (fileSize > MaxAvatarBytes)
            throw new ValidationException("Avatar must be 10 MB or smaller.");

        var user = await db.Users.FindAsync(id)
            ?? throw new NotFoundException($"User {id} not found.");

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var avatarDir = Path.Combine(webRoot, "avatars");
        Directory.CreateDirectory(avatarDir);
        var filePath = Path.Combine(avatarDir, $"{id}.jpg");

        using var image = await Image.LoadAsync(imageStream);

        if (crop is not null)
            image.Mutate(x => x.Crop(new Rectangle(crop.X, crop.Y, crop.Width, crop.Height)));

        // Centre-crop to square
        var size = Math.Min(image.Width, image.Height);
        image.Mutate(x => x
            .Crop(new Rectangle((image.Width - size) / 2, (image.Height - size) / 2, size, size))
            .Resize(AvatarSizePx, AvatarSizePx));

        await image.SaveAsJpegAsync(filePath);

        user.AvatarUrl = $"/avatars/{id}.jpg";
        await db.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateConfigurationAsync(Guid id, Guid requesterId, UpdateUserConfigurationRequest request)
    {
        if (id != requesterId)
            throw new UnauthorizedException("You can only update your own configuration.");

        var user = await db.Users.FindAsync(id)
            ?? throw new NotFoundException($"User {id} not found.");

        if (!Enum.TryParse<DefaultTasksView>(request.DefaultTasksView, out var defaultTasksView))
            throw new ValidationException("Invalid DefaultTasksView value.");
        if (!Enum.TryParse<TimeAxisDirection>(request.TimeAxisDirection, out var timeAxisDirection))
            throw new ValidationException("Invalid TimeAxisDirection value.");
        if (!Enum.TryParse<TimeAxisPosition>(request.TimeAxisPosition, out var timeAxisPosition))
            throw new ValidationException("Invalid TimeAxisPosition value.");
        if (request.AutoSaveDelaySeconds < 0 || request.AutoSaveDelaySeconds > 10)
            throw new ValidationException("AutoSaveDelaySeconds must be between 0 and 10.");

        if (timeAxisDirection == TimeAxisDirection.Horizontal &&
            timeAxisPosition != TimeAxisPosition.Top && timeAxisPosition != TimeAxisPosition.Bottom)
            throw new ValidationException("TimeAxisPosition must be Top or Bottom when direction is Horizontal.");
        if (timeAxisDirection == TimeAxisDirection.Vertical &&
            timeAxisPosition != TimeAxisPosition.Left && timeAxisPosition != TimeAxisPosition.Right)
            throw new ValidationException("TimeAxisPosition must be Left or Right when direction is Vertical.");

        // Assign a new instance so EF Core's change-detection snapshot picks up the mutation.
        user.Configuration = new UserConfiguration
        {
            DefaultTasksView = defaultTasksView,
            TimeAxisDirection = timeAxisDirection,
            TimeAxisPosition = timeAxisPosition,
            AutoSaveDelaySeconds = request.AutoSaveDelaySeconds,
            ShowMiniMap = request.ShowMiniMap,
        };

        await db.SaveChangesAsync();
        return ToResponse(user);
    }

    private static UserResponse ToResponse(Models.User u) =>
        new(u.Id, u.Username, u.FirstName, u.LastName, u.Email, u.AvatarUrl,
            new UserConfigurationResponse(
                u.Configuration.DefaultTasksView.ToString(),
                u.Configuration.TimeAxisDirection.ToString(),
                u.Configuration.TimeAxisPosition.ToString(),
                u.Configuration.AutoSaveDelaySeconds,
                u.Configuration.ShowMiniMap));

    private static void ValidateEmail(string email)
    {
        try { _ = new MailAddress(email); }
        catch { throw new ValidationException("Invalid email format."); }
    }
}
