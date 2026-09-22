using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizPlatform.Application.DTOs.Quiz;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Creator,Admin")]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuizzesController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetUserQuizzes()
    {
        var quizzes = await _quizService.GetUserQuizzesAsync(GetUserId());
        return Ok(quizzes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuizById(Guid id)
    {
        var quiz = await _quizService.GetQuizByIdAsync(id, GetUserId());
        if (quiz == null) return NotFound();
        return Ok(quiz);
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizDto dto)
    {
        var quiz = await _quizService.CreateQuizAsync(GetUserId(), dto);
        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] UpdateQuizDto dto)
    {
        try
        {
            var quiz = await _quizService.UpdateQuizAsync(id, GetUserId(), dto);
            return Ok(quiz);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        await _quizService.DeleteQuizAsync(id, GetUserId());
        return NoContent();
    }

    [HttpPost("{id}/duplicate")]
    public async Task<IActionResult> DuplicateQuiz(Guid id)
    {
        try
        {
            var quiz = await _quizService.DuplicateQuizAsync(id, GetUserId());
            return Ok(quiz);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }
}
