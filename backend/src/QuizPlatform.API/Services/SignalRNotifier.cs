using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.API.Hubs;

namespace QuizPlatform.API.Services;

public class SignalRNotifier : ISignalRNotifier
{
    private readonly IHubContext<GameHub> _hubContext;

    public SignalRNotifier(IHubContext<GameHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyAnswerSubmittedAsync(Guid sessionId, Guid participantId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("AnswerSubmitted", new { participantId });
    }

    public async Task NotifyQuestionStartedAsync(Guid sessionId, object questionDto, int timeLimit)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("QuestionStarted", new { questionDto, timeLimit, startedAt = DateTime.UtcNow });
    }

    public async Task NotifyTimerTickAsync(Guid sessionId, int remainingSeconds)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("TimerTick", new { remainingSeconds });
    }

    public async Task NotifyQuestionFinishedAsync(Guid sessionId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("QuestionFinished");
    }

    public async Task NotifyLeaderboardUpdatedAsync(Guid sessionId, System.Collections.Generic.List<QuizPlatform.Application.DTOs.Leaderboard.LeaderboardEntryDto> leaderboard)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("LeaderboardUpdated", leaderboard);
    }

    public async Task NotifyShowQuestionResultsAsync(Guid sessionId, object resultsData)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("ShowQuestionResults", resultsData);
    }
}
