using System;
using System.Linq;
using System.Text.Json;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.Services;

public class ScoringService : IScoringService
{
    public int CalculateScore(QuizQuestion question, double responseTimeSeconds, bool isCorrect)
    {
        if (!isCorrect) return 0;

        var maxScore = question.MaxScore ?? question.Quiz.DefaultMaxScore;
        var minScore = question.MinScore ?? 0;
        var speedBonusEnabled = question.SpeedBonusEnabled ?? question.Quiz.DefaultSpeedBonus;
        var timeLimit = question.TimeLimit ?? question.Quiz.DefaultTimeLimit;

        if (timeLimit <= 0) timeLimit = 30; // safeguard

        var baseScore = maxScore;
        double speedBonus = 0;

        if (speedBonusEnabled)
        {
            var clampedResponseTime = Math.Max(0, Math.Min(responseTimeSeconds, timeLimit));
            var speedMultiplier = (timeLimit - clampedResponseTime) / timeLimit;
            // E.g., max 50% extra score as speed bonus
            speedBonus = baseScore * speedMultiplier * 0.5;
        }

        var totalScore = (int)Math.Max(minScore, baseScore + speedBonus);
        return totalScore;
    }

    public bool CheckCorrectness(QuizQuestion question, string? submittedOptionsJson, string? textAnswer)
    {
        if (question.Type == QuestionType.OpenEnded)
        {
            if (string.IsNullOrWhiteSpace(textAnswer))
                return false;
            
            // Get accepted answers from QuestionOption
            var acceptedAnswers = question.Options
                .Where(o => o.IsCorrect)
                .Select(o => o.OptionText)
                .ToList();
            
            if (!acceptedAnswers.Any())
                return false; // No accepted answers defined, needs manual review
            
            // Normalize: Trim + Turkish culture-insensitive lowercase
            var normalizedSubmitted = NormalizeText(textAnswer);
            
            return acceptedAnswers.Any(accepted => 
                NormalizeText(accepted) == normalizedSubmitted
            );
        }

        if (string.IsNullOrEmpty(submittedOptionsJson)) return false;

        try
        {
            var submittedOptionIds = JsonSerializer.Deserialize<Guid[]>(submittedOptionsJson);
            if (submittedOptionIds == null) return false;

            var correctOptions = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList();

            // Match arrays exactly
            if (correctOptions.Count != submittedOptionIds.Length) return false;

            return correctOptions.All(c => submittedOptionIds.Contains(c));
        }
        catch
        {
            return false;
        }
    }

    private string NormalizeText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;
        
        // Convert Turkish characters to English equivalents
        text = text.Trim()
            .Replace('ı', 'i')
            .Replace('İ', 'i')
            .Replace('ş', 's')
            .Replace('Ş', 's')
            .Replace('ğ', 'g')
            .Replace('Ğ', 'g')
            .Replace('ü', 'u')
            .Replace('Ü', 'u')
            .Replace('ö', 'o')
            .Replace('Ö', 'o')
            .Replace('ç', 'c')
            .Replace('Ç', 'c');
        
        return text.ToLowerInvariant();
    }
}
