using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Quiz> Quizzes { get; }
    DbSet<QuizQuestion> QuizQuestions { get; }
    DbSet<QuestionOption> QuestionOptions { get; }
    DbSet<GameSession> GameSessions { get; }
    DbSet<GameParticipant> GameParticipants { get; }
    DbSet<Answer> Answers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
