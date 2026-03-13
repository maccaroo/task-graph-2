using TaskGraph.Api.DTOs.Users;

namespace TaskGraph.Api.Services;

public interface IUserService
{
    Task<IEnumerable<UserSummaryResponse>> GetAllAsync();
    Task<UserResponse> GetByIdAsync(Guid id);
    Task<UserResponse> UpdateAsync(Guid id, Guid requesterId, UpdateUserRequest request);
    Task<UserResponse> UpdateAvatarAsync(Guid id, Guid requesterId, Stream imageStream, string fileName, long fileSize, AvatarCrop? crop);
}

public record AvatarCrop(int X, int Y, int Width, int Height);
