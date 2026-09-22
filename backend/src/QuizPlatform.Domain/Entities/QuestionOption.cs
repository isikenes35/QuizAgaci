using System;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class QuestionOption
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public int OrderIndex { get; set; }
    public string OptionText { get; set; } = null!;
    public bool IsCorrect { get; set; }
    
    // Navigation
    public QuizQuestion Question { get; set; } = null!;
}
