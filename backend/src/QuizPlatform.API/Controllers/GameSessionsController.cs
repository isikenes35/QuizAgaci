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
            var session = await _sessionService.GetSessionByIdAsync(id, Guid.Empty);
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

        var questions = await dbContext.QuizQuestions
            .Include(q => q.Options)
            .Where(q => q.QuizId == session.QuizId)
            .OrderBy(q => q.OrderIndex)
            .ToListAsync();

        if (questions.Count == 0) return BadRequest(new { message = "No questions found" });

        QuizPlatform.Domain.Entities.QuizQuestion? question = null;
        
        if (session.CurrentQuestionId.HasValue)
        {
            var currentIndex = questions.FindIndex(q => q.Id == session.CurrentQuestionId.Value);
            if (currentIndex >= 0 && currentIndex + 1 < questions.Count)
            {
                question = questions[currentIndex + 1];
            }
            else
            {
                return BadRequest(new { message = "No more questions" });
            }
        }
        else
        {
            question = questions[0];
        }

        session.CurrentQuestionId = question.Id;
        session.Status = QuizPlatform.Domain.Enums.GameSessionStatus.Running;
        session.QuestionStartedAt = System.DateTime.UtcNow;
        var timeLimit = question.TimeLimit ?? 30;
        session.CurrentQuestionTimeLimit = timeLimit;
        session.IsImageHidden = false;

        await dbContext.SaveChangesAsync(default);

        var needsManualReview = question.RequiresManualReview || question.Type == QuizPlatform.Domain.Enums.QuestionType.OpenEnded;
        timerService.StartTimer(session.Id, timeLimit, needsManualReview);

        var qDto = new 
        { 
            Id = question.Id, 
            QuestionText = question.QuestionText, 
            Type = question.Type,
            ImagePath = question.ImagePath,
            Options = question.Options.Select(o => new { o.Id, o.OptionText }).ToList()
        };
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
    public async Task<IActionResult> ShowResults(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.ISignalRNotifier notifier, [FromServices] QuizPlatform.Application.Interfaces.IGameTimerService timerService)
    {
        timerService.StopTimer(id);
        var session = await dbContext.GameSessions.Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        var pendingAnswersCount = await dbContext.Answers.CountAsync(a => a.GameSessionId == id && a.QuestionId == session.CurrentQuestionId && a.ReviewStatus == QuizPlatform.Domain.Enums.AnswerReviewStatus.Pending);
        if (pendingAnswersCount > 0)
        {
            await notifier.NotifyQuestionFinishedAsync(session.Id);
            await notifier.NotifyManualReviewRequiredAsync(session.Id);
            return Ok();
        }

        // 1. Fetch current question to broadcast correct answers
        var question = await dbContext.QuizQuestions.Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == session.CurrentQuestionId);

        object? resultsData = null;
        if (question != null)
        {
            var correctOptionIds = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList();
            
            var participantCorrectness = await dbContext.Answers
                .Where(a => a.GameSessionId == id && a.QuestionId == session.CurrentQuestionId)
                .Select(a => new { a.ParticipantId, a.IsCorrect })
                .ToDictionaryAsync(a => a.ParticipantId.ToString(), a => a.IsCorrect);
                
            resultsData = new { correctOptionIds, explanation = question.ExplanationText, participantCorrectness };
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
        var question = session.CurrentQuestionId.HasValue ? await dbContext.QuizQuestions.Include(q => q.Options).FirstOrDefaultAsync(q => q.Id == session.CurrentQuestionId.Value) : null;

        var currentAnswersCount = 0;
        if (session.CurrentQuestionId.HasValue)
        {
            currentAnswersCount = await dbContext.Answers.CountAsync(a => a.GameSessionId == id && a.QuestionId == session.CurrentQuestionId.Value);
        }

        return Ok(new
        {
            currentAnswersCount,
            session.Status,
            currentTimeRemaining = remainingTime,
            currentQuestion = question != null ? new 
            { 
                question.Id, 
                question.QuestionText, 
                question.Type,
                question.ImagePath,
                Options = question.Options.Select(o => new { o.Id, o.OptionText }).ToList()
            } : null,
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

    [HttpPost("{id}/finish")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> FinishGame(Guid id, [FromServices] QuizPlatform.Application.Interfaces.IApplicationDbContext dbContext, [FromServices] QuizPlatform.Application.Interfaces.ISignalRNotifier notifier)
    {
        var session = await dbContext.GameSessions.Include(s => s.Participants).FirstOrDefaultAsync(s => s.Id == id);
        if (session == null || session.HostUserId != GetUserId()) return NotFound();

        var sortedParticipants = session.Participants.OrderByDescending(p => p.TotalScore).ToList();
        var leaderboard = new System.Collections.Generic.List<QuizPlatform.Application.DTOs.Leaderboard.LeaderboardEntryDto>();
        for (int i = 0; i < sortedParticipants.Count; i++)
        {
            var p = sortedParticipants[i];
            leaderboard.Add(new QuizPlatform.Application.DTOs.Leaderboard.LeaderboardEntryDto
            {
                ParticipantId = p.Id,
                Nickname = p.Nickname,
                TotalScore = p.TotalScore,
                Rank = i + 1,
                ScoreDelta = 0
            });
        }

        await notifier.NotifyGameEndedAsync(session.Id, leaderboard);
        
        session.Status = QuizPlatform.Domain.Enums.GameSessionStatus.Finished;
        await dbContext.SaveChangesAsync(default);

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

