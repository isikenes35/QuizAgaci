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
}