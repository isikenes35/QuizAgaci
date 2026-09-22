using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using QuizPlatform.Application.DTOs.GameSession;

namespace QuizPlatform.Application.Interfaces;

public interface IGameSessionService
{
    Task<GameSessionDto> StartGameSessionAsync(Guid quizId, Guid hostUserId);
    Task<GameSessionDto> GetSessionByIdAsync(Guid sessionId, Guid userId);
    Task<GameSessionDto> GetSessionByCodeAsync(string gameCode);
    Task<IEnumerable<GameParticipantDto>> GetParticipantsAsync(Guid sessionId);
}
