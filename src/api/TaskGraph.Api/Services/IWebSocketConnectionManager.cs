using System.Net.WebSockets;

namespace TaskGraph.Api.Services;

public interface IWebSocketConnectionManager
{
    void Add(Guid userId, WebSocket socket);
    void Remove(Guid userId, WebSocket socket);
    Task BroadcastToUserAsync(Guid userId, object payload);
}
