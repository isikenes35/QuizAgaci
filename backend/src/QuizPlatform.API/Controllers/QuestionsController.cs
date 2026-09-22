using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizPlatform.Application.DTOs.Question;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/")]
[Authorize(Roles = "Creator,Admin")]
public class QuestionsController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuestionsController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("quizzes/{quizId}/questions")]
    public async Task<IActionResult> GetQuestions(Guid quizId)
    {
        try
        {
            var questions = await _quizService.GetQuizQuestionsAsync(quizId, GetUserId());
            return Ok(questions);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPost("quizzes/{quizId}/questions")]
    public async Task<IActionResult> AddQuestion(Guid quizId, [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = await _quizService.AddQuestionAsync(quizId, GetUserId(), dto);
            return Ok(question);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPut("questions/{id}")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = await _quizService.UpdateQuestionAsync(id, GetUserId(), dto);
            return Ok(question);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("questions/{id}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        await _quizService.DeleteQuestionAsync(id, GetUserId());
        return NoContent();
    }

    [HttpPatch("quizzes/{quizId}/questions/reorder")]
    public async Task<IActionResult> ReorderQuestions(Guid quizId, [FromBody] List<Guid> questionIds)
    {
        await _quizService.ReorderQuestionsAsync(quizId, GetUserId(), questionIds);
        return NoContent();
    }
}
