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

        var configuredMax = question.MaxScore ?? (question.Quiz != null && question.Quiz.DefaultMaxScore > 0 ? question.Quiz.DefaultMaxScore : 2000);
        var maxScore = configuredMax <= 1000 ? 2000 : configuredMax;

        var minScore = question.MinScore.GetValueOrDefault(1000);
        if (minScore <= 0) minScore = 1000;

        if (maxScore < minScore) maxScore = minScore * 2;

        var speedBonusEnabled = question.SpeedBonusEnabled ?? (question.Quiz?.DefaultSpeedBonus ?? true);
        var timeLimit = question.TimeLimit ?? (question.Quiz?.DefaultTimeLimit ?? 30);

        if (timeLimit <= 0) timeLimit = 30;

        if (!speedBonusEnabled)
        {
            return maxScore;
        }

        var clampedResponseTime = Math.Max(0, Math.Min(responseTimeSeconds, timeLimit));

        // 10 saniyelik okuma suresi (grace period) - ilk 10 saniye boyunca puan 2000 olarak kalir
        var gracePeriod = Math.Min(10.0, Math.Max(0.0, timeLimit - 5.0));
        var decayWindow = Math.Max(timeLimit - gracePeriod, 1.0);

        double speedMultiplier = 1.0;
        if (clampedResponseTime > gracePeriod)
        {
            var elapsedDecay = clampedResponseTime - gracePeriod;
            speedMultiplier = Math.Max(0.0, (decayWindow - elapsedDecay) / decayWindow);
        }

        var totalScore = (int)Math.Round(minScore + ((maxScore - minScore) * speedMultiplier));
        return Math.Max(minScore, totalScore);
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
