using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        var question = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
            dbContext.QuizQuestions, q => q.QuizId == session.QuizId);

        if (question == null) return BadRequest("No questions found");

        session.CurrentQuestionId = question.Id;
        session.Status = QuizPlatform.Domain.Enums.GameSessionStatus.Running;
        session.QuestionStartedAt = System.DateTime.UtcNow;
        var timeLimit = question.TimeLimit ?? 30;
        session.CurrentQuestionTimeLimit = timeLimit;

        await dbContext.SaveChangesAsync(default);

        timerService.StartTimer(session.Id, timeLimit);

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
}