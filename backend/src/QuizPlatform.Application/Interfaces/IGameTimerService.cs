using System;

namespace QuizPlatform.Application.Interfaces;

public interface IGameTimerService
{
    void StartTimer(Guid sessionId, int durationSeconds);
    void PauseTimer(Guid sessionId);
    void ResumeTimer(Guid sessionId);
    void ExtendTimer(Guid sessionId, int additionalSeconds);
    void StopTimer(Guid sessionId);
}
