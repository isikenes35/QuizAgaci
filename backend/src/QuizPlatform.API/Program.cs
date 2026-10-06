using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using QuizPlatform.Application;
using QuizPlatform.Infrastructure;
using QuizPlatform.API.Hubs;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using System;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SignalR
builder.Services.AddSignalR().AddJsonProtocol(options => { options.PayloadSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()); options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase; });

// Extension methods from Application and Infrastructure
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add local services
builder.Services.AddSingleton<QuizPlatform.Application.Interfaces.ISignalRNotifier, QuizPlatform.API.Services.SignalRNotifier>();
builder.Services.AddSingleton<QuizPlatform.Application.Interfaces.IGameTimerService, QuizPlatform.API.Services.GameTimerService>();
builder.Services.AddHostedService(provider => (QuizPlatform.API.Services.GameTimerService)provider.GetRequiredService<QuizPlatform.Application.Interfaces.IGameTimerService>());

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // needed for SignalR
    });
});

// Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret not found");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/gamehub"))
                {
                    context.Token = accessToken;
                }
                return System.Threading.Tasks.Task.CompletedTask;
            }
        };
    });

builder.Configuration.AddJsonFile("appsettings.Secret.json", optional: true, reloadOnChange: true);

var app = builder.Build();

// Seed Initial Admin/Allowed Users from appsettings.Secret.json
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<QuizPlatform.Infrastructure.Data.ApplicationDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<QuizPlatform.Application.Interfaces.IPasswordHasher>();
    var configuration = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
    
    var initialUsers = configuration.GetSection("InitialUsers").Get<QuizPlatform.API.Models.InitialUser[]>();
    if (initialUsers != null)
    {
        foreach (var iu in initialUsers)
        {
            if (!System.Linq.Enumerable.Any(context.Users, u => u.Email == iu.Email))
            {
                context.Users.Add(new QuizPlatform.Domain.Entities.User
                {
                    Id = Guid.NewGuid(),
                    Email = iu.Email,
                    FullName = iu.FullName ?? "User",
                    PasswordHash = passwordHasher.HashPassword(iu.Password),
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        context.SaveChanges();
    }
}

// Global Exception Handler
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var contextFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        if (contextFeature != null)
        {
            // Loglama mekanizmanız varsa buraya eklenebilir
            System.Console.WriteLine($"[Global Error] {contextFeature.Error}");
            
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = app.Environment.IsDevelopment() 
                    ? $"Sunucu hatası: {contextFeature.Error.Message}" 
                    : "Beklenmeyen bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."
            });
        }
    });
});

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/gamehub");

app.Run();

