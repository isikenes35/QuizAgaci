using Microsoft.Extensions.DependencyInjection;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Application.Services;

namespace QuizPlatform.Application;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
