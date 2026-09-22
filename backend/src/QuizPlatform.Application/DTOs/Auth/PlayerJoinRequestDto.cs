namespace QuizPlatform.Application.DTOs.Auth;

public class PlayerJoinRequestDto
{
    public string GameCode { get; set; } = null!;
    public string Nickname { get; set; } = null!;
}
