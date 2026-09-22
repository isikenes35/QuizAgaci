using System;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.DTOs.GameSession;

public class GameSessionDto
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public Guid HostUserId { get; set; }
    public string GameCode { get; set; } = null!;
    public GameSessionStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GameParticipantDto
{
    public Guid Id { get; set; }
    public string Nickname { get; set; } = null!;
    public int TotalScore { get; set; }
    public bool IsConnected { get; set; }
}
