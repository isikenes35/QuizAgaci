using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.DTOs.Question;
using QuizPlatform.Application.DTOs.Quiz;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.Services;

public class QuizService : IQuizService
{
    private readonly IApplicationDbContext _context;

    public QuizService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<QuizDto>> GetUserQuizzesAsync(Guid userId)
    {
        return await _context.Quizzes
            .Where(q => q.UserId == userId)
            .OrderByDescending(q => q.UpdatedAt)
            .Select(q => new QuizDto
            {
                Id = q.Id,
                UserId = q.UserId,
                Title = q.Title,
                Description = q.Description,
                CoverImagePath = q.CoverImagePath,
                Language = q.Language,
                Status = q.Status,
                DefaultTimeLimit = q.DefaultTimeLimit,
                DefaultMaxScore = q.DefaultMaxScore,
                DefaultSpeedBonus = q.DefaultSpeedBonus,
                CreatedAt = q.CreatedAt,
                UpdatedAt = q.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<QuizDto?> GetQuizByIdAsync(Guid id, Guid userId)
    {
        var q = await _context.Quizzes.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (q == null) return null;
        
        return new QuizDto
        {
            Id = q.Id,
            UserId = q.UserId,
            Title = q.Title,
            Description = q.Description,
            CoverImagePath = q.CoverImagePath,
            Language = q.Language,
            Status = q.Status,
            DefaultTimeLimit = q.DefaultTimeLimit,
            DefaultMaxScore = q.DefaultMaxScore,
            DefaultSpeedBonus = q.DefaultSpeedBonus,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt
        };
    }

    public async Task<QuizDto> CreateQuizAsync(Guid userId, CreateQuizDto dto)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = dto.Title,
            Description = dto.Description,
            Language = dto.Language,
            Status = QuizStatus.Draft,
            DefaultTimeLimit = dto.DefaultTimeLimit,
            DefaultMaxScore = dto.DefaultMaxScore,
            DefaultSpeedBonus = dto.DefaultSpeedBonus,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync(default);

        return await GetQuizByIdAsync(quiz.Id, userId) ?? throw new Exception("Error creating quiz");
    }

    public async Task<QuizDto> UpdateQuizAsync(Guid id, Guid userId, UpdateQuizDto dto)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);
        if (quiz == null) throw new InvalidOperationException("Quiz not found");

        quiz.Title = dto.Title;
        quiz.Description = dto.Description;
        quiz.CoverImagePath = dto.CoverImagePath;
        quiz.Language = dto.Language;
        quiz.Status = dto.Status;
        quiz.DefaultTimeLimit = dto.DefaultTimeLimit;
        quiz.DefaultMaxScore = dto.DefaultMaxScore;
        quiz.DefaultSpeedBonus = dto.DefaultSpeedBonus;
        quiz.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(default);

        return await GetQuizByIdAsync(quiz.Id, userId) ?? throw new Exception("Error updating quiz");
    }

    public async Task DeleteQuizAsync(Guid id, Guid userId)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);
        if (quiz != null)
        {
            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync(default);
        }
    }

    public async Task<QuizDto> DuplicateQuizAsync(Guid id, Guid userId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (quiz == null) throw new InvalidOperationException("Quiz not found");

        var newQuiz = new Quiz
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = quiz.Title + " (Copy)",
            Description = quiz.Description,
            CoverImagePath = quiz.CoverImagePath,
            Language = quiz.Language,
            Status = QuizStatus.Draft,
            DefaultTimeLimit = quiz.DefaultTimeLimit,
            DefaultMaxScore = quiz.DefaultMaxScore,
            DefaultSpeedBonus = quiz.DefaultSpeedBonus,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var q in quiz.Questions)
        {
            var newQuestion = new QuizQuestion
            {
                Id = Guid.NewGuid(),
                QuizId = newQuiz.Id,
                OrderIndex = q.OrderIndex,
                Type = q.Type,
                QuestionText = q.QuestionText,
                ImagePath = q.ImagePath,
                ExplanationText = q.ExplanationText,
                TimeLimit = q.TimeLimit,
                MaxScore = q.MaxScore,
                MinScore = q.MinScore,
                SpeedBonusEnabled = q.SpeedBonusEnabled,
                ImageVisibilityDuration = q.ImageVisibilityDuration,
                HideImageAfterTimer = q.HideImageAfterTimer,
                RequiresManualReview = q.RequiresManualReview,
                AllowAlternativeAnswer = q.AllowAlternativeAnswer,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var opt in q.Options)
            {
                newQuestion.Options.Add(new QuestionOption
                {
                    Id = Guid.NewGuid(),
                    QuestionId = newQuestion.Id,
                    OrderIndex = opt.OrderIndex,
                    OptionText = opt.OptionText,
                    IsCorrect = opt.IsCorrect
                });
            }
            newQuiz.Questions.Add(newQuestion);
        }

        _context.Quizzes.Add(newQuiz);
        await _context.SaveChangesAsync(default);

        return await GetQuizByIdAsync(newQuiz.Id, userId) ?? throw new Exception("Error duplicating quiz");
    }

    public async Task<IEnumerable<QuestionDto>> GetQuizQuestionsAsync(Guid quizId, Guid userId)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == quizId && q.UserId == userId);
        if (quiz == null) throw new InvalidOperationException("Quiz not found");

        var questions = await _context.QuizQuestions
            .Include(q => q.Options)
            .Where(q => q.QuizId == quizId)
            .OrderBy(q => q.OrderIndex)
            .ToListAsync();

        return questions.Select(MapToDto);
    }

    public async Task<QuestionDto> AddQuestionAsync(Guid quizId, Guid userId, CreateQuestionDto dto)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == quizId && q.UserId == userId);
        if (quiz == null) throw new InvalidOperationException("Quiz not found");

        var maxOrder = await _context.QuizQuestions.Where(q => q.QuizId == quizId).MaxAsync(q => (int?)q.OrderIndex) ?? 0;

        var question = new QuizQuestion
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            OrderIndex = maxOrder + 1,
            Type = dto.Type,
            QuestionText = dto.QuestionText,
            ImagePath = dto.ImagePath,
            ExplanationText = dto.ExplanationText,
            TimeLimit = dto.TimeLimit,
            MaxScore = dto.MaxScore,
            MinScore = dto.MinScore,
            SpeedBonusEnabled = dto.SpeedBonusEnabled,
            ImageVisibilityDuration = dto.ImageVisibilityDuration,
            HideImageAfterTimer = dto.HideImageAfterTimer,
            RequiresManualReview = dto.RequiresManualReview,
            AllowAlternativeAnswer = dto.AllowAlternativeAnswer,
            CreatedAt = DateTime.UtcNow
        };

        var order = 0;
        foreach (var opt in dto.Options)
        {
            question.Options.Add(new QuestionOption
            {
                Id = Guid.NewGuid(),
                QuestionId = question.Id,
                OrderIndex = order++,
                OptionText = opt.OptionText,
                IsCorrect = opt.IsCorrect
            });
        }

        _context.QuizQuestions.Add(question);
        quiz.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return MapToDto(question);
    }

    public async Task<QuestionDto> UpdateQuestionAsync(Guid questionId, Guid userId, CreateQuestionDto dto)
    {
        var question = await _context.QuizQuestions
            .Include(q => q.Options)
            .Include(q => q.Quiz)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.Quiz.UserId == userId);

        if (question == null) throw new InvalidOperationException("Question not found");

        question.Type = dto.Type;
        question.QuestionText = dto.QuestionText;
        question.ImagePath = dto.ImagePath;
        question.ExplanationText = dto.ExplanationText;
        question.TimeLimit = dto.TimeLimit;
        question.MaxScore = dto.MaxScore;
        question.MinScore = dto.MinScore;
        question.SpeedBonusEnabled = dto.SpeedBonusEnabled;
        question.ImageVisibilityDuration = dto.ImageVisibilityDuration;
        question.HideImageAfterTimer = dto.HideImageAfterTimer;
        question.RequiresManualReview = dto.RequiresManualReview;
        question.AllowAlternativeAnswer = dto.AllowAlternativeAnswer;

        // Simplify options update by recreate (since we don't have option IDs passed in CreateQuestionDto)
        _context.QuestionOptions.RemoveRange(question.Options);
        question.Options.Clear();

        var order = 0;
        foreach (var opt in dto.Options)
        {
            question.Options.Add(new QuestionOption
            {
                Id = Guid.NewGuid(),
                QuestionId = question.Id,
                OrderIndex = order++,
                OptionText = opt.OptionText,
                IsCorrect = opt.IsCorrect
            });
        }

        question.Quiz.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return MapToDto(question);
    }

    public async Task DeleteQuestionAsync(Guid questionId, Guid userId)
    {
        var question = await _context.QuizQuestions
            .Include(q => q.Quiz)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.Quiz.UserId == userId);

        if (question != null)
        {
            _context.QuizQuestions.Remove(question);
            question.Quiz.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(default);
        }
    }

    public async Task ReorderQuestionsAsync(Guid quizId, Guid userId, List<Guid> questionIds)
    {
        var questions = await _context.QuizQuestions
            .Include(q => q.Quiz)
            .Where(q => q.QuizId == quizId && q.Quiz.UserId == userId)
            .ToListAsync();

        if (!questions.Any()) return;

        for (int i = 0; i < questionIds.Count; i++)
        {
            var q = questions.FirstOrDefault(x => x.Id == questionIds[i]);
            if (q != null)
            {
                q.OrderIndex = i;
            }
        }

        questions.First().Quiz.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);
    }

    private QuestionDto MapToDto(QuizQuestion q)
    {
        return new QuestionDto
        {
            Id = q.Id,
            QuizId = q.QuizId,
            OrderIndex = q.OrderIndex,
            Type = q.Type,
            QuestionText = q.QuestionText,
            ImagePath = q.ImagePath,
            ExplanationText = q.ExplanationText,
            TimeLimit = q.TimeLimit,
            MaxScore = q.MaxScore,
            MinScore = q.MinScore,
            SpeedBonusEnabled = q.SpeedBonusEnabled,
            ImageVisibilityDuration = q.ImageVisibilityDuration,
            HideImageAfterTimer = q.HideImageAfterTimer,
            RequiresManualReview = q.RequiresManualReview,
            AllowAlternativeAnswer = q.AllowAlternativeAnswer,
            Options = q.Options.OrderBy(o => o.OrderIndex).Select(o => new QuestionOptionDto
            {
                Id = o.Id,
                OrderIndex = o.OrderIndex,
                OptionText = o.OptionText,
                IsCorrect = o.IsCorrect
            }).ToList()
        };
    }
}
