using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGraph.Api.DTOs.Auth;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Services;

namespace TaskGraph.Api.Controllers;

[ApiController]
[Route("auth")]
[AllowAnonymous]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [HttpPost("logout")]
    public IActionResult Logout() => NoContent();

    [HttpPost("password-reset-request")]
    public async Task<IActionResult> PasswordResetRequest([FromBody] PasswordResetRequestRequest request)
    {
        try
        {
            var response = await authService.RequestPasswordResetAsync(request);
            return Ok(response);
        }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPost("password-reset")]
    public async Task<IActionResult> PasswordReset([FromBody] PasswordResetConfirmRequest request)
    {
        try
        {
            await authService.ResetPasswordAsync(request);
            return NoContent();
        }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }
}
