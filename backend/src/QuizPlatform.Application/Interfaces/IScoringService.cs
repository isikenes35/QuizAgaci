using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Application.Interfaces;

public interface IScoringService
{
    int CalculateScore(QuizQuestion question, double responseTimeSeconds, bool isCorrect);
    bool CheckCorrectness(QuizQuestion question, string? submittedOptionsJson, string? textAnswer);
}
