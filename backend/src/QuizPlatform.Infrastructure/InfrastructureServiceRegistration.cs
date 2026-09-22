using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuizPlatform.Application.Interfaces;
using QuizPlatform.Infrastructure.Data;
using QuizPlatform.Infrastructure.Services;

namespace QuizPlatform.Infrastructure;

public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString)) 
                throw new System.InvalidOperationException("Connection string 'DefaultConnection' not found.");
                
            options.UseMySql(connectionString, ServerVersion.Parse("8.0.30-mysql"));
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtProvider, JwtProvider>();
        services.AddScoped<IFileStorageService, FileStorageService>();

        return services;
    }
}
