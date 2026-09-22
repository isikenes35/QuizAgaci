using System;
using System.Collections.Generic;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class GameSession
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public Guid HostUserId { get; set; }
    public string GameCode { get; set; } = null!;
    public GameSessionStatus Status { get; set; }
    
    public Guid? CurrentQuestionId { get; set; }
    public DateTime? QuestionStartedAt { get; set; }
    public int? CurrentQuestionTimeLimit { get; set; }
    public bool IsImageHidden { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    
    // Navigation
    public Quiz Quiz { get; set; } = null!;
    public User HostUser { get; set; } = null!;
    public ICollection<GameParticipant> Participants { get; set; } = new List<GameParticipant>();
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
}
