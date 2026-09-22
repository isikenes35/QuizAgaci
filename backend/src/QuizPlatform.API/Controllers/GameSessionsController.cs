using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.DTOs.Auth;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GameSessionsController : ControllerBase
{
    private readonly IGameSessionService _sessionService;

    public GameSessionsController(IGameSessionService sessionService)
    {
        _sessionService = sessionService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    [HttpPost("start")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> StartSession([FromBody] Guid quizId)
    {
        try
        {
            var session = await _sessionService.StartGameSessionAsync(quizId, GetUserId());
            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        try
        {
            // For now, allow any authenticated user to see their own sessions
            var session = await _sessionService.GetSessionByIdAsync(id, GetUserId());
            return Ok(session);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpGet("code/{gameCode}")]
    [AllowAnonymous] // Players can check session status without auth
    public async Task<IActionResult> GetSessionByCode(string gameCode)
    {
        try
        {
            var session = await _sessionService.GetSessionByCodeAsync(gameCode);
            return Ok(session);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id}/participants")]
    public async Task<IActionResult> GetParticipants(Guid id)
    {
        try
        {
            var participants = await _sessionService.GetParticipantsAsync(id);
            return Ok(participants);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id}/next-question")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> NextQuestion(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.ISignalRNotifier notifier, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        var session = await dbContext.GameSessions.FindAsync(id);
        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        // Let's just pick the first question for MVP
        var question = await dbContext.QuizQuestions.FirstOrDefaultAsync(q => q.QuizId == session.QuizId);

        if (question == null) return BadRequest("No questions found");

        session.CurrentQuestionId = question.Id;
        session.Status = QuizPlatform.Domain.Enums.GameSessionStatus.Running;
        session.QuestionStartedAt = System.DateTime.UtcNow;
        var timeLimit = question.TimeLimit ?? 30;
        session.CurrentQuestionTimeLimit = timeLimit;

        await dbContext.SaveChangesAsync(default);

        var needsManualReview = question.RequiresManualReview || question.Type == QuizPlatform.Domain.Enums.QuestionType.OpenEnded;
        timerService.StartTimer(session.Id, timeLimit, needsManualReview);

        var qDto = new { question.Id, question.QuestionText, question.Type };
        await notifier.NotifyQuestionStartedAsync(session.Id, qDto, timeLimit);

        return Ok();
    }

    [HttpPost("{id}/pause")]
    [Authorize(Roles = "Creator,Admin")]
    public IActionResult Pause(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        timerService.PauseTimer(id);
        return Ok();
    }

    [HttpPost("{id}/resume")]
    [Authorize(Roles = "Creator,Admin")]
    public IActionResult Resume(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        timerService.ResumeTimer(id);
        return Ok();
    }

    [HttpPost("{id}/extend")]
    [Authorize(Roles = "Creator,Admin")]
    public IActionResult Extend(Guid id, [FromBody] int additionalSeconds, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        timerService.ExtendTimer(id, additionalSeconds);
        return Ok();
    }

    [HttpPost("{id}/show-results")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ShowResults(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.ISignalRNotifier notifier)
    {
        var session = await dbContext.GameSessions.Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        // 1. Fetch current question to broadcast correct answers
        var question = await dbContext.QuizQuestions.Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == session.CurrentQuestionId);

        object? resultsData = null;
        if (question != null)
        {
            var correctOptionIds = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList();
            resultsData = new { correctOptionIds, explanation = question.ExplanationText };
        }

        // 2. Fetch Leaderboard
        var sortedParticipants = session.Participants.OrderByDescending(p => p.TotalScore).ToList();
        var leaderboard = new System.Collections.Generic.List<QuizPlatform.Application.DTOs.Leaderboard.LeaderboardEntryDto>();
        for (int i = 0; i < sortedParticipants.Count; i++)
        {
            var p = sortedParticipants[i];
            
            var lastAnswer = await dbContext.Answers.FirstOrDefaultAsync(a => a.GameSessionId == id && a.QuestionId == session.CurrentQuestionId && a.ParticipantId == p.Id);

            leaderboard.Add(new QuizPlatform.Application.DTOs.Leaderboard.LeaderboardEntryDto
            {
                ParticipantId = p.Id,
                Nickname = p.Nickname,
                TotalScore = p.TotalScore,
                Rank = i + 1,
                ScoreDelta = lastAnswer?.ScoreAwarded ?? 0
            });
        }

        if (resultsData != null)
        {
            await notifier.NotifyShowQuestionResultsAsync(session.Id, resultsData);
        }
        await notifier.NotifyLeaderboardUpdatedAsync(session.Id, leaderboard);

        return Ok();
    }

    [HttpGet("{id}/state")]
    [Authorize(Roles = "Player,Creator,Admin")]
    public async Task<IActionResult> GetSessionState(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        var session = await dbContext.GameSessions.FindAsync(id);
        if (session == null) return NotFound();

        var remainingTime = timerService.GetRemainingTime(id);
        var question = session.CurrentQuestionId.HasValue ? await dbContext.QuizQuestions.FindAsync(session.CurrentQuestionId.Value) : null;

        return Ok(new
        {
            session.Status,
            currentTimeRemaining = remainingTime,
            currentQuestion = question != null ? new { question.Id, question.QuestionText, question.Type } : null,
            session.IsImageHidden
        });
    }

    [HttpPost("{id}/hide-image")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> HideImage(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.ISignalRNotifier notifier)
    {
        var session = await dbContext.GameSessions.FindAsync(id);
        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        session.IsImageHidden = true;
        await dbContext.SaveChangesAsync(default);

        await notifier.NotifyImageHiddenAsync(id);
        return Ok();
    }

    [HttpGet("{id}/export")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ExportResults(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext)
    {
        var session = await dbContext.GameSessions.Include(s => s.Participants).FirstOrDefaultAsync(s => s.Id == id);
        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        var builder = new System.Text.StringBuilder();
        builder.AppendLine("Nickname,Total Score,Joined At");
        foreach (var p in session.Participants.OrderByDescending(x => x.TotalScore))
        {
            builder.AppendLine($"{p.Nickname},{p.TotalScore},{p.JoinedAt:yyyy-MM-dd HH:mm:ss}");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(builder.ToString());
        return File(bytes, "text/csv", $"game_results_{session.GameCode}.csv");
    }
}