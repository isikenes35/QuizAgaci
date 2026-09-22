using System;
using System.Collections.Generic;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class Quiz
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverImagePath { get; set; }
    public string Language { get; set; } = "en";
    public QuizStatus Status { get; set; }
    
    public int DefaultTimeLimit { get; set; } = 30; // seconds
    public int DefaultMaxScore { get; set; } = 1000;
    public bool DefaultSpeedBonus { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation
    public User User { get; set; } = null!;
    public ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    public ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();
}
