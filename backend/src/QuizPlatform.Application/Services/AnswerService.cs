using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.DTOs.Answer;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.Services;

public class AnswerService : IAnswerService
{
    private readonly IApplicationDbContext _context;
    private readonly IScoringService _scoringService;
    // We send an event to the Hub directly when answer is submitted
    // But since Application layer shouldn't depend on API layer (Hubs),
    // We use a domain event or just an action abstraction. We'll use an IPublisher interface.
    // For simplicity without MediatR, we can define an IHubNotifier in Application layer and implement it in Infrastructure.
    // Wait, the plan delegates SignalR to later or infrastructure.
    // Let's create an ISignalRNotifier interface.

    private readonly ISignalRNotifier _notifier;

    public AnswerService(IApplicationDbContext context, IScoringService scoringService, ISignalRNotifier notifier)
    {
        _context = context;
        _scoringService = scoringService;
        _notifier = notifier;
    }

    public async Task<AnswerResponseDto> SubmitAnswerAsync(Guid participantId, SubmitAnswerDto dto)
    {
        var participant = await _context.GameParticipants
            .FirstOrDefaultAsync(p => p.Id == participantId && p.GameSessionId == dto.GameSessionId);

        if (participant == null) return new AnswerResponseDto { Success = false, Message = "Invalid participant" };

        var session = await _context.GameSessions
            .FirstOrDefaultAsync(s => s.Id == dto.GameSessionId);

        if (session == null || session.CurrentQuestionId != dto.QuestionId || session.Status != GameSessionStatus.Running)
        {
            return new AnswerResponseDto { Success = false, Message = "Question is not currently active" };
        }

        var alreadyAnswered = await _context.Answers
            .AnyAsync(a => a.GameSessionId == dto.GameSessionId && a.ParticipantId == participantId && a.QuestionId == dto.QuestionId);

        if (alreadyAnswered)
        {
            return new AnswerResponseDto { Success = false, Message = "Already answered" };
        }

        var question = await _context.QuizQuestions
            .Include(q => q.Quiz)
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == dto.QuestionId);

        if (question == null) return new AnswerResponseDto { Success = false, Message = "Question not found" };

        var now = DateTime.UtcNow;
        var responseTime = session.QuestionStartedAt.HasValue 
            ? (now - session.QuestionStartedAt.Value).TotalSeconds 
            : 0;

        var isCorrect = false;
        int score = 0;
        var needsReview = question.RequiresManualReview || question.Type == QuestionType.OpenEnded;
        var reviewStatus = needsReview ? AnswerReviewStatus.Pending : AnswerReviewStatus.NotRequired;
        
        var optionsJson = JsonSerializer.Serialize(dto.SelectedOptionIds);

        if (!needsReview)
        {
            isCorrect = _scoringService.CheckCorrectness(question, optionsJson, dto.TextAnswer);
            score = _scoringService.CalculateScore(question, responseTime, isCorrect);
        }

        // Add Score to participant immediately if not pending
        if (score > 0)
        {
            participant.TotalScore += score;
        }

        var answer = new Answer
        {
            Id = Guid.NewGuid(),
            GameSessionId = dto.GameSessionId,
            ParticipantId = participantId,
            QuestionId = dto.QuestionId,
            Type = dto.SelectedOptionIds.Count > 0 ? AnswerType.OptionBased : AnswerType.TextBased,
            SelectedOptionIds = optionsJson,
            TextAnswer = dto.TextAnswer,
            SubmittedAt = now,
            ResponseTimeSeconds = responseTime,
            IsCorrect = isCorrect,
            ScoreAwarded = score,
            ReviewStatus = reviewStatus
        };

        _context.Answers.Add(answer);
        await _context.SaveChangesAsync(default);

        // Notify Host that an answer was submitted safely
        await _notifier.NotifyAnswerSubmittedAsync(session.Id, participantId);

        return new AnswerResponseDto { Success = true, Message = "Answer submitted", AnswerId = answer.Id };
    }

    public async Task<IEnumerable<PendingAnswerDto>> GetPendingAnswersAsync(Guid sessionId, Guid hostUserId)
    {
        var session = await _context.GameSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.HostUserId == hostUserId);
        if (session == null) throw new InvalidOperationException("Session not found or forbidden");

        return await _context.Answers
            .Include(a => a.Participant)
            .Where(a => a.GameSessionId == sessionId && a.QuestionId == session.CurrentQuestionId && a.ReviewStatus == AnswerReviewStatus.Pending)
            .Select(a => new PendingAnswerDto
            {
                AnswerId = a.Id,
                Nickname = a.Participant.Nickname,
                TextAnswer = a.TextAnswer
            })
            .ToListAsync();
    }

    public async Task ReviewAnswerAsync(Guid answerId, Guid hostUserId, ReviewAnswerDto dto)
    {
        var answer = await _context.Answers
            .Include(a => a.GameSession)
            .Include(a => a.Participant)
            .FirstOrDefaultAsync(a => a.Id == answerId && a.GameSession.HostUserId == hostUserId);

        if (answer == null) throw new InvalidOperationException("Answer not found");
        if (answer.ReviewStatus != AnswerReviewStatus.Pending) throw new InvalidOperationException("Answer is not pending review");

        answer.IsCorrect = dto.IsCorrect;
        answer.ScoreAwarded = dto.ScoreAwarded;
        answer.ReviewStatus = dto.IsCorrect ? AnswerReviewStatus.Approved : AnswerReviewStatus.Rejected;
        
        answer.Participant.TotalScore += dto.ScoreAwarded;

        await _context.SaveChangesAsync(default);
    }

    public async Task ResumeFromReviewAsync(Guid sessionId, Guid hostUserId)
    {
        var session = await _context.GameSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.HostUserId == hostUserId);
        if (session == null) throw new InvalidOperationException("Session not found");

        await _notifier.NotifyGameResumedAsync(sessionId);
    }
}
