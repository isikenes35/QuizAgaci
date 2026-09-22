using Microsoft.Extensions.DependencyInjection;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Application.Services;

namespace QuizPlatform.Application;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IGameCodeGenerator, GameCodeGenerator>();
        services.AddScoped<IGameSessionService, GameSessionService>();
        services.AddScoped<IScoringService, ScoringService>();
        services.AddScoped<IAnswerService, AnswerService>();
        return services;
    }
}
