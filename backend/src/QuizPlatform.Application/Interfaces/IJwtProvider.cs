using System.Collections.Generic;
using System.Security.Claims;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Application.Interfaces;

public interface IJwtProvider
{
    string GenerateToken(User user);
    string GeneratePlayerToken(GameParticipant participant);
}
