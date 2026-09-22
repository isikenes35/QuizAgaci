using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizPlatform.Application.DTOs.Answer;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Player")]
public class AnswersController : ControllerBase
{
    private readonly IAnswerService _answerService;

    public AnswersController(IAnswerService answerService)
    {
        _answerService = answerService;
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerDto request)
    {
        var participantIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(participantIdStr, out var participantId)) 
            return Unauthorized();

        var result = await _answerService.SubmitAnswerAsync(participantId, request);
        
        if (!result.Success) return BadRequest(new { result.Message });
        
        return Ok(result);
    }
}
