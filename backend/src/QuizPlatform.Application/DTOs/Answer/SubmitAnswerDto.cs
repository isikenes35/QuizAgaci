using System;
using System.Collections.Generic;

namespace QuizPlatform.Application.DTOs.Answer;

public class SubmitAnswerDto
{
    public Guid GameSessionId { get; set; }
    public Guid QuestionId { get; set; }
    public List<Guid> SelectedOptionIds { get; set; } = new();
    public string? TextAnswer { get; set; }
}

public class AnswerResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = null!;
    public Guid? AnswerId { get; set; }
}
