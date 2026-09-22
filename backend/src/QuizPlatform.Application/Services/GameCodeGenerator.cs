using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Application.Services;

public class GameCodeGenerator : IGameCodeGenerator
{
    private const string Chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 32 characters, exclude O, 0, I, 1, L
    private readonly Random _random = new();
    private readonly IApplicationDbContext _context;

    public GameCodeGenerator(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateUniqueCodeAsync()
    {
        string code;
        int attempts = 0;
        const int maxAttempts = 10;

        do
        {
            code = new string(Enumerable.Range(0, 5).Select(_ => Chars[_random.Next(Chars.Length)]).ToArray());
            attempts++;
            
            if (attempts >= maxAttempts)
            {
                // Fallback to GUID-based suffix if collision persists
                return code + _random.Next(10).ToString();
            }
        }
        while (await _context.GameSessions.AnyAsync(s => s.GameCode == code));

        return code;
    }
}