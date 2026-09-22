using System;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.DTOs.Quiz;

public class QuizDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverImagePath { get; set; }
    public string Language { get; set; } = "en";
    public QuizStatus Status { get; set; }
    
    public int DefaultTimeLimit { get; set; }
    public int DefaultMaxScore { get; set; }
    public bool DefaultSpeedBonus { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
