using System;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class Answer
{
    public Guid Id { get; set; }
    public Guid GameSessionId { get; set; }
    public Guid ParticipantId { get; set; }
    public Guid QuestionId { get; set; }
    
    public AnswerType Type { get; set; }
    public string? SelectedOptionIds { get; set; }
    public string? TextAnswer { get; set; }
    
    public DateTime SubmittedAt { get; set; }
    public double ResponseTimeSeconds { get; set; }
    
    public bool IsCorrect { get; set; }
    public int ScoreAwarded { get; set; }
    public AnswerReviewStatus ReviewStatus { get; set; }
    
    // Navigation
    public GameSession GameSession { get; set; } = null!;
    public GameParticipant Participant { get; set; } = null!;
    public QuizQuestion Question { get; set; } = null!;
}
