using System;
using System.Collections.Generic;

namespace QuizPlatform.Application.DTOs.Leaderboard;

public class LeaderboardEntryDto
{
    public Guid ParticipantId { get; set; }
    public string Nickname { get; set; } = null!;
    public int TotalScore { get; set; }
    public int Rank { get; set; }
    public int ScoreDelta { get; set; } // Score gained in the last question
}
