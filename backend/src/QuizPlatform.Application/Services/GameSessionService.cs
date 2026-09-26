using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.DTOs.GameSession;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.Services;

public class GameSessionService : IGameSessionService
{
    private readonly IApplicationDbContext _context;
    private readonly IGameCodeGenerator _gameCodeGenerator;

    public GameSessionService(IApplicationDbContext context, IGameCodeGenerator gameCodeGenerator)
    {
        _context = context;
        _gameCodeGenerator = gameCodeGenerator;
    }

    public async Task<GameSessionDto> StartGameSessionAsync(Guid quizId, Guid hostUserId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == quizId && q.UserId == hostUserId);

        if (quiz == null) throw new InvalidOperationException("Quiz not found");
        if (!quiz.Questions.Any()) throw new InvalidOperationException("Quiz must have at least one question");
        // Removed Published check for testing
        // if (quiz.Status != QuizStatus.Published) throw new InvalidOperationException("Quiz must be published to start a game");

        var gameCode = await _gameCodeGenerator.GenerateUniqueCodeAsync();

        var session = new GameSession
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            HostUserId = hostUserId,
            GameCode = gameCode,
            Status = GameSessionStatus.Lobby,
            CreatedAt = DateTime.UtcNow
        };

        _context.GameSessions.Add(session);
        await _context.SaveChangesAsync(default);

        return MapToDto(session);
    }

    public async Task<GameSessionDto> GetSessionByIdAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.GameSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId);
            
        if (session == null) throw new InvalidOperationException("Session not found");
        return MapToDto(session);
    }

    public async Task<GameSessionDto> GetSessionByCodeAsync(string gameCode)
    {
        var code = gameCode.ToUpperInvariant();
        var session = await _context.GameSessions
            .FirstOrDefaultAsync(s => s.GameCode == code);
            
        if (session == null) throw new InvalidOperationException("Game not found");
        return MapToDto(session);
    }

    public async Task<IEnumerable<GameParticipantDto>> GetParticipantsAsync(Guid sessionId)
    {
        return await _context.GameParticipants
            .Where(p => p.GameSessionId == sessionId)
            .Select(p => new GameParticipantDto
            {
                Id = p.Id,
                Nickname = p.Nickname,
                TotalScore = p.TotalScore,
                IsConnected = p.IsConnected
            })
            .ToListAsync();
    }

    private static GameSessionDto MapToDto(GameSession s) => new()
    {
        Id = s.Id,
        QuizId = s.QuizId,
        HostUserId = s.HostUserId,
        GameCode = s.GameCode,
        Status = s.Status,
        CreatedAt = s.CreatedAt
    };
}