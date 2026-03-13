using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using TaskGraph.Api.DTOs.Users;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Services;

namespace TaskGraph.Api.Controllers;

[ApiController]
[Route("users")]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var user = await userService.GetByIdAsync(id);
            return Ok(user);
        }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await userService.UpdateAsync(id, GetRequesterId(), request);
            return Ok(user);
        }
        catch (UnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/avatar")]
    public async Task<IActionResult> UpdateAvatar(
        Guid id,
        IFormFile file,
        [FromForm] int? cropX,
        [FromForm] int? cropY,
        [FromForm] int? cropWidth,
        [FromForm] int? cropHeight)
    {
        if (file is null)
            return BadRequest(new { error = "File is required." });

        AvatarCrop? crop = null;
        if (cropX.HasValue && cropY.HasValue && cropWidth.HasValue && cropHeight.HasValue)
            crop = new AvatarCrop(cropX.Value, cropY.Value, cropWidth.Value, cropHeight.Value);

        try
        {
            using var stream = file.OpenReadStream();
            var user = await userService.UpdateAvatarAsync(
                id, GetRequesterId(), stream, file.FileName, file.Length, crop);
            return Ok(user);
        }
        catch (UnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    private Guid GetRequesterId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedException("Requester identity not found."));
}
