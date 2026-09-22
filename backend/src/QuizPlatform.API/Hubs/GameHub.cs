using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace QuizPlatform.API.Hubs;

public class GameHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // Authorization happens during connection handshake
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
