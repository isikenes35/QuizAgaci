namespace QuizPlatform.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    public string? SessionToken { get; set; }
    public System.Guid? ParticipantId { get; set; }
}
