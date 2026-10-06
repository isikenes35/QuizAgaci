using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.API.Hubs;
using QuizPlatform.Domain.Entities;

using QuizPlatform.Application.DTOs.Leaderboard;

namespace QuizPlatform.API.Services;

public class SignalRNotifier : ISignalRNotifier
{
    private readonly IHubContext<GameHub> _hubContext;

    public SignalRNotifier(IHubContext<GameHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyPlayerJoinedAsync(Guid sessionId, GameParticipant participant)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("PlayerJoined", new 
        { 
            id = participant.Id, 
            nickname = participant.Nickname,
            totalScore = participant.TotalScore,
            isConnected = participant.IsConnected
        });
    }

    public async Task NotifyAnswerSubmittedAsync(Guid sessionId, Guid participantId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("AnswerSubmitted", new { participantId });
    }

    public async Task NotifyQuestionStartedAsync(Guid sessionId, object questionDto, int timeLimit)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("QuestionStarted", questionDto, timeLimit);
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

    public async Task NotifyManualReviewRequiredAsync(Guid sessionId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("ManualReviewRequired");
    }

    public async Task NotifyGameResumedAsync(Guid sessionId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("GameResumed");
    }

    public async Task NotifyImageHiddenAsync(Guid sessionId)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("ImageHidden");
    }
    
    public async Task NotifyGameEndedAsync(Guid sessionId, List<LeaderboardEntryDto> finalLeaderboard)
    {
        await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("GameEnded", finalLeaderboard);
    }
}
