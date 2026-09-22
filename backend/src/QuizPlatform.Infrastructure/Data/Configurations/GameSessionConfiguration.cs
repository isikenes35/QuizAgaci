using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Infrastructure.Data.Configurations;

public class GameSessionConfiguration : IEntityTypeConfiguration<GameSession>
{
    public void Configure(EntityTypeBuilder<GameSession> builder)
    {
        builder.HasKey(g => g.Id);
        builder.Property(g => g.GameCode).IsRequired().HasMaxLength(10);
        
        builder.HasIndex(g => g.GameCode).IsUnique();
        builder.HasIndex(g => new { g.HostUserId, g.Status });
        builder.HasIndex(g => new { g.Status, g.CreatedAt });
        
        builder.HasOne(g => g.Quiz)
            .WithMany(q => q.GameSessions)
            .HasForeignKey(g => g.QuizId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasOne(g => g.HostUser)
            .WithMany()
            .HasForeignKey(g => g.HostUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
