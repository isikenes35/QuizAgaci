using System;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.DTOs.Quiz;

public class CreateQuizDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Language { get; set; } = "en";
    
    public int DefaultTimeLimit { get; set; } = 30;
    public int DefaultMaxScore { get; set; } = 1000;
    public bool DefaultSpeedBonus { get; set; } = true;
}

public class UpdateQuizDto : CreateQuizDto
{
    public string? CoverImagePath { get; set; }
    public QuizStatus Status { get; set; }
}
