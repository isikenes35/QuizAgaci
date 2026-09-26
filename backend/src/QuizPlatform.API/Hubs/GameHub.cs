using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace QuizPlatform.API.Hubs;

public class GameHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public async Task JoinGameGroup(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
    }

    public async Task LeaveGameGroup(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
    }

    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
