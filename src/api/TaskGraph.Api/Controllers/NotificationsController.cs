using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Services;

namespace TaskGraph.Api.Controllers;

[ApiController]
[Route("notifications")]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notifications = await notificationService.GetAllForUserAsync(GetRequesterId());
        return Ok(notifications);
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        try
        {
            var notification = await notificationService.MarkAsReadAsync(id, GetRequesterId());
            return Ok(notification);
        }
        catch (UnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    private Guid GetRequesterId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedException("Requester identity not found."));
}
