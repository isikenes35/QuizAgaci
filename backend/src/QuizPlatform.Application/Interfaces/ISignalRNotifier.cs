using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using QuizPlatform.Application.DTOs.Leaderboard;

namespace QuizPlatform.Application.Interfaces;

public interface ISignalRNotifier
{
    Task NotifyAnswerSubmittedAsync(Guid sessionId, Guid participantId);
    Task NotifyQuestionStartedAsync(Guid sessionId, object questionDto, int timeLimit);
    Task NotifyTimerTickAsync(Guid sessionId, int remainingSeconds);
    Task NotifyQuestionFinishedAsync(Guid sessionId);
    
    Task NotifyLeaderboardUpdatedAsync(Guid sessionId, List<LeaderboardEntryDto> leaderboard);
    Task NotifyShowQuestionResultsAsync(Guid sessionId, object resultsData);
    
    Task NotifyManualReviewRequiredAsync(Guid sessionId);
    Task NotifyGameResumedAsync(Guid sessionId);
}
