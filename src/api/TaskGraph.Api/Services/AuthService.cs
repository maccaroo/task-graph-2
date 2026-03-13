using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Auth;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    private const int MinPasswordLength = 8;

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        ValidateNotEmpty(request.Username, nameof(request.Username));
        ValidateNotEmpty(request.FirstName, nameof(request.FirstName));
        ValidateNotEmpty(request.LastName, nameof(request.LastName));
        ValidateNotEmpty(request.Email, nameof(request.Email));
        ValidateEmail(request.Email);
        ValidatePassword(request.Password);

        if (await db.Users.AnyAsync(u => u.Username == request.Username))
            throw new ConflictException("Username already taken.");

        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            throw new ConflictException("Email already registered.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return new LoginResponse(GenerateJwt(user));
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == request.Username)
            ?? throw new UnauthorizedException("Invalid credentials.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid credentials.");

        return new LoginResponse(GenerateJwt(user));
    }

    public async Task<PasswordResetRequestResponse> RequestPasswordResetAsync(PasswordResetRequestRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new NotFoundException("User not found.");

        // Remove any existing tokens for this user before issuing a new one
        var existing = await db.PasswordResetTokens.Where(t => t.UserId == user.Id).ToListAsync();
        db.PasswordResetTokens.RemoveRange(existing);

        var token = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        db.PasswordResetTokens.Add(token);
        await db.SaveChangesAsync();

        return new PasswordResetRequestResponse(token.Id.ToString());
    }

    public async Task ResetPasswordAsync(PasswordResetConfirmRequest request)
    {
        if (!Guid.TryParse(request.Token, out var tokenId))
            throw new ValidationException("Invalid token.");

        var token = await db.PasswordResetTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Id == tokenId)
            ?? throw new NotFoundException("Invalid or expired token.");

        if (token.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedException("Token has expired.");

        ValidatePassword(request.NewPassword);

        token.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        db.PasswordResetTokens.Remove(token);
        await db.SaveChangesAsync();
    }

    private string GenerateJwt(User user)
    {
        var jwtSection = config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["SecretKey"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = int.Parse(jwtSection["ExpiryMinutes"] ?? "60");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Email, user.Email)
        };

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static void ValidateNotEmpty(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ValidationException($"{fieldName} is required.");
    }

    private static void ValidateEmail(string email)
    {
        try { _ = new MailAddress(email); }
        catch { throw new ValidationException("Invalid email format."); }
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinPasswordLength)
            throw new ValidationException($"Password must be at least {MinPasswordLength} characters.");
    }
}
