using System;

namespace QuizPlatform.Application.DTOs.Answer;

public class PendingAnswerDto
{
    public Guid AnswerId { get; set; }
    public string Nickname { get; set; } = null!;
    public string? TextAnswer { get; set; }
}

public class ReviewAnswerDto
{
    public bool IsCorrect { get; set; }
    // If not correct, host might assign partial score or 0.
    public int ScoreAwarded { get; set; }
}
