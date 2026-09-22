using System;
using System.Collections.Generic;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Domain.Entities;

public class GameParticipant
{
    public Guid Id { get; set; }
    public Guid GameSessionId { get; set; }
    public string Nickname { get; set; } = null!;
    public string SessionToken { get; set; } = null!;
    public string? ConnectionId { get; set; }
    public int TotalScore { get; set; }
    public DateTime JoinedAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public bool IsConnected { get; set; }
    
    // Navigation
    public GameSession GameSession { get; set; } = null!;
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
}
