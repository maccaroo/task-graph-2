using TaskGraph.Api.DTOs.Auth;

namespace TaskGraph.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<PasswordResetRequestResponse> RequestPasswordResetAsync(PasswordResetRequestRequest request);
    Task ResetPasswordAsync(PasswordResetConfirmRequest request);
}
