namespace TaskGraph.Api.DTOs.Auth;

public record PasswordResetConfirmRequest(string Token, string NewPassword);
