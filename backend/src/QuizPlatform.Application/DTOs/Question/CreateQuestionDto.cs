using System;
using System.Collections.Generic;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.DTOs.Question;

public class CreateQuestionDto
{
    public QuestionType Type { get; set; }
    public string QuestionText { get; set; } = null!;
    public string? ImagePath { get; set; }
    public string? ExplanationText { get; set; }
    
    public int? TimeLimit { get; set; }
    public int? MaxScore { get; set; }
    public int? MinScore { get; set; }
    public bool? SpeedBonusEnabled { get; set; }
    
    public int? ImageVisibilityDuration { get; set; }
    public bool HideImageAfterTimer { get; set; }
    
    public bool RequiresManualReview { get; set; }
    public bool AllowAlternativeAnswer { get; set; }
    
    public List<CreateQuestionOptionDto> Options { get; set; } = new();
}

public class CreateQuestionOptionDto
{
    public string OptionText { get; set; } = null!;
    public bool IsCorrect { get; set; }
}
