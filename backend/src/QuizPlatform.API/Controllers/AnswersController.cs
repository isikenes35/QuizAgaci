using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizPlatform.Application.DTOs.Answer;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnswersController : ControllerBase
{
    private readonly IAnswerService _answerService;

    public AnswersController(IAnswerService answerService)
    {
        _answerService = answerService;
    }

    [HttpPost("submit")]
    [Authorize]
    public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerDto request)
    {
        var participantIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(participantIdStr, out var participantId)) 
            return Unauthorized();

        var result = await _answerService.SubmitAnswerAsync(participantId, request);
        
        if (!result.Success) return BadRequest(new { result.Message });
        
        return Ok(result);
    }

    [HttpGet("session/{sessionId}/pending")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> GetPendingAnswers(Guid sessionId)
    {
        var hostId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var pending = await _answerService.GetPendingAnswersAsync(sessionId, hostId);
            return Ok(pending);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPatch("{id}/review")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ReviewAnswer(Guid id, [FromBody] ReviewAnswerDto dto)
    {
        var hostId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        try
        {
            await _answerService.ReviewAnswerAsync(id, hostId, dto);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return BadRequest();
        }
    }

    [HttpPost("session/{sessionId}/resume-from-review")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> ResumeFromReview(Guid sessionId)
    {
        var hostId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        try
        {
            await _answerService.ResumeFromReviewAsync(sessionId, hostId);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }
}
