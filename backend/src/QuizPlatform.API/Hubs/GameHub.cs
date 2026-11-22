// SignalR hub for real-time game sessions mapped at /gamehub.
// Clients join session-ID groups so SignalRNotifier can broadcast events per session.
// Player connections are also tracked on GameParticipant (ConnectionId, IsConnected, LastSeenAt)
// so AuthService can tell a disconnected seat from an active one.
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.Interfaces;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace QuizPlatform.API.Hubs;

public class GameHub : Hub
{
    private readonly IApplicationDbContext _context;

    public GameHub(IApplicationDbContext context)
    {
        _context = context;
    }

    // Subscribes the connection to all real-time broadcasts for the given game session.
    // For players, also records this connection as their live one.
    public async Task JoinGameGroup(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

        var participantId = GetPlayerParticipantId();
        if (participantId == null) return;

        var participant = await _context.GameParticipants.FirstOrDefaultAsync(p => p.Id == participantId.Value);
        if (participant == null || participant.GameSessionId.ToString() != sessionId) return;

        participant.ConnectionId = Context.ConnectionId;
        participant.IsConnected = true;
        participant.LastSeenAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);
    }

    // Unsubscribes the connection from broadcasts for the given game session.
    public async Task LeaveGameGroup(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
    }

    // Marks the player offline, but only if this was their latest connection
    // (an older tab closing must not mark a newer, live tab as offline).
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participantId = GetPlayerParticipantId();
        if (participantId != null)
        {
            var participant = await _context.GameParticipants.FirstOrDefaultAsync(p => p.Id == participantId.Value);
            if (participant != null && participant.ConnectionId == Context.ConnectionId)
            {
                participant.IsConnected = false;
                participant.LastSeenAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(default);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Reads the participant ID from a player JWT; returns null for hosts and anonymous connections.
    private Guid? GetPlayerParticipantId()
    {
        var user = Context.User;
        if (user == null || !user.IsInRole("Player")) return null;

        var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst("sub")?.Value;
        return Guid.TryParse(id, out var parsed) ? parsed : null;
    }
}
