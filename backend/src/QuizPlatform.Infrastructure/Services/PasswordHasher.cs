using QuizPlatform.Application.Interfaces;
using BCryptHas = BCrypt.Net.BCrypt;

namespace QuizPlatform.Infrastructure.Services;

public class PasswordHasher : IPasswordHasher
{
    public string HashPassword(string password)
    {
        return BCryptHas.HashPassword(password, 12);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCryptHas.Verify(password, passwordHash);
    }
}
