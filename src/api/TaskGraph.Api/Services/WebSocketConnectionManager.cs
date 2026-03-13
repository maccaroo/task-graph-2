using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace TaskGraph.Api.Services;

public class WebSocketConnectionManager : IWebSocketConnectionManager
{
    private readonly ConcurrentDictionary<Guid, List<WebSocket>> _connections = new();

    public void Add(Guid userId, WebSocket socket)
    {
        _connections.AddOrUpdate(
            userId,
            _ => [socket],
            (_, list) => { lock (list) { list.Add(socket); } return list; });
    }

    public void Remove(Guid userId, WebSocket socket)
    {
        if (_connections.TryGetValue(userId, out var list))
            lock (list) { list.Remove(socket); }
    }

    public async Task BroadcastToUserAsync(Guid userId, object payload)
    {
        if (!_connections.TryGetValue(userId, out var list))
            return;

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        List<WebSocket> snapshot;
        lock (list) { snapshot = [.. list]; }

        foreach (var ws in snapshot.Where(ws => ws.State == WebSocketState.Open))
            await ws.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
