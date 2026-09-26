using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using QuizPlatform.Application.DTOs.Auth;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Domain.Entities;
using QuizPlatform.Domain.Enums;

namespace QuizPlatform.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtProvider _jwtProvider;
    private readonly ISignalRNotifier _signalRNotifier;

    public AuthService(IApplicationDbContext context, IPasswordHasher passwordHasher, IJwtProvider jwtProvider, ISignalRNotifier signalRNotifier)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtProvider = jwtProvider;
        _signalRNotifier = signalRNotifier;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (userExists) throw new InvalidOperationException("Email already exists");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            FullName = request.FullName,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(default);

        var token = _jwtProvider.GenerateToken(user);
        return new AuthResponseDto { Token = token };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid email or password");
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        var token = _jwtProvider.GenerateToken(user);
        return new AuthResponseDto { Token = token };
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string token)
    {
        var userId = _jwtProvider.ValidateToken(token);
        if (userId == null) 
            throw new InvalidOperationException("Invalid token");

        var user = await _context.Users.FindAsync(Guid.Parse(userId));
        if (user == null) 
            throw new InvalidOperationException("User not found");

        var newToken = _jwtProvider.GenerateToken(user);
        return new AuthResponseDto { Token = newToken };
    }

    public async Task<AuthResponseDto> JoinGameAsync(PlayerJoinRequestDto request)
    {
        var gameCode = request.GameCode.ToUpperInvariant();
        var session = await _context.GameSessions
            .FirstOrDefaultAsync(s => s.GameCode == gameCode && 
                (s.Status == Domain.Enums.GameSessionStatus.Lobby || s.Status == Domain.Enums.GameSessionStatus.Running));
                
        if (session == null) throw new InvalidOperationException("Game not found or finished.");

        // Nickname uniqueness check
        var nickname = request.Nickname.Trim();
        var existingParticipant = await _context.GameParticipants
            .FirstOrDefaultAsync(p => p.GameSessionId == session.Id && p.Nickname == nickname);

        if (existingParticipant != null)
        {
            // Plan decision: Block duplicate nicknames with clear error
            throw new InvalidOperationException("Nickname already taken in this game session.");
        }

        var participant = new GameParticipant
        {
            Id = Guid.NewGuid(),
            GameSessionId = session.Id,
            Nickname = nickname,
            SessionToken = Guid.NewGuid().ToString("N"),
            TotalScore = 0,
            JoinedAt = DateTime.UtcNow,
            IsConnected = false
        };

        _context.GameParticipants.Add(participant);
        await _context.SaveChangesAsync(default);

        // Notify host via SignalR that a new player joined
        await _signalRNotifier.NotifyPlayerJoinedAsync(session.Id, participant);

        var token = _jwtProvider.GeneratePlayerToken(participant);
        return new AuthResponseDto { Token = token };
    }
}
