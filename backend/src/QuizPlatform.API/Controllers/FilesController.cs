using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizPlatform.Application.Interfaces;

namespace QuizPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Creator,Admin")]
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _fileStorageService;

    public FilesController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    [HttpPost("upload/quiz-cover")]
    public async Task<IActionResult> UploadQuizCover(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        using var stream = file.OpenReadStream();
        var path = await _fileStorageService.SaveFileAsync(stream, file.FileName, "uploads/quiz-covers");
        return Ok(new { url = path });
    }

    [HttpPost("upload/question-image")]
    public async Task<IActionResult> UploadQuestionImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        using var stream = file.OpenReadStream();
        var path = await _fileStorageService.SaveFileAsync(stream, file.FileName, "uploads/question-images");
        return Ok(new { url = path });
    }
}
