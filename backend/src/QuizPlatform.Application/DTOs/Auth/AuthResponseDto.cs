namespace QuizPlatform.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    // In a real app we'd also return RefreshToken
}
