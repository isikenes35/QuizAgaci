using System;
using System.Collections.Generic;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class QuizQuestion
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public int OrderIndex { get; set; }
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
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation
    public Quiz Quiz { get; set; } = null!;
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
}
