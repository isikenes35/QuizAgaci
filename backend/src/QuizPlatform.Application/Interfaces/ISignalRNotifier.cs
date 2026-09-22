using System;
using System.Threading.Tasks;

namespace QuizPlatform.Application.Interfaces;

public interface ISignalRNotifier
{
    Task NotifyAnswerSubmittedAsync(Guid sessionId, Guid participantId);
    Task NotifyQuestionStartedAsync(Guid sessionId, object questionDto, int timeLimit);
    Task NotifyTimerTickAsync(Guid sessionId, int remainingSeconds);
    Task NotifyQuestionFinishedAsync(Guid sessionId);
}
