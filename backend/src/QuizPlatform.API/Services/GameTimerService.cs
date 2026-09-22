using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Services;

public class GameTimerState
{
    public Guid SessionId { get; set; }
    public int RemainingSeconds { get; set; }
    public bool IsPaused { get; set; }
    public bool NeedsManualReview { get; set; }
}

public class GameTimerService : BackgroundService, IGameTimerService
{
    private readonly ConcurrentDictionary<Guid, GameTimerState> _activeTimers = new();
    private readonly ISignalRNotifier _notifier;
    private readonly ILogger<GameTimerService> _logger;

    public GameTimerService(ISignalRNotifier notifier, ILogger<GameTimerService> logger)
    {
        _notifier = notifier;
        _logger = logger;
    }

    public void StartTimer(Guid sessionId, int durationSeconds, bool needsManualReview = false)
    {
        var state = new GameTimerState
        {
            SessionId = sessionId,
            RemainingSeconds = durationSeconds,
            IsPaused = false,
            NeedsManualReview = needsManualReview
        };
        _activeTimers[sessionId] = state;
    }

    public void PauseTimer(Guid sessionId)
    {
        if (_activeTimers.TryGetValue(sessionId, out var state))
        {
            state.IsPaused = true;
        }
    }

    public void ResumeTimer(Guid sessionId)
    {
        if (_activeTimers.TryGetValue(sessionId, out var state))
        {
            state.IsPaused = false;
        }
    }

    public void ExtendTimer(Guid sessionId, int additionalSeconds)
    {
        if (_activeTimers.TryGetValue(sessionId, out var state))
        {
            state.RemainingSeconds += additionalSeconds;
        }
    }

    public void StopTimer(Guid sessionId)
    {
        _activeTimers.TryRemove(sessionId, out _);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                foreach (var (sessionId, state) in _activeTimers)
                {
                    if (state.IsPaused) continue;

                    state.RemainingSeconds--;

                    if (state.RemainingSeconds > 0)
                    {
                        await _notifier.NotifyTimerTickAsync(sessionId, state.RemainingSeconds);
                    }
                    else
                    {
                        await _notifier.NotifyTimerTickAsync(sessionId, 0);
                        await _notifier.NotifyQuestionFinishedAsync(sessionId);
                        
                        if (state.NeedsManualReview)
                        {
                            await _notifier.NotifyManualReviewRequiredAsync(sessionId);
                        }

                        StopTimer(sessionId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing game timer loop");
            }

            await Task.Delay(1000, stoppingToken);
        }
    }
}
