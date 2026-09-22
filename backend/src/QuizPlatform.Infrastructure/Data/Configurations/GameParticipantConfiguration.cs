using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Infrastructure.Data.Configurations;

public class GameParticipantConfiguration : IEntityTypeConfiguration<GameParticipant>
{
    public void Configure(EntityTypeBuilder<GameParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Nickname).IsRequired().HasMaxLength(50);
        builder.Property(p => p.SessionToken).IsRequired().HasMaxLength(255);
        builder.Property(p => p.ConnectionId).HasMaxLength(255);
        
        // I chose to enforce unique Nickname per GameSession to require uniqueness 
        // as considered in the plan notes (either suffix or block with this index).
        builder.HasIndex(p => new { p.GameSessionId, p.Nickname }).IsUnique();
        
        builder.HasIndex(p => p.SessionToken).IsUnique();
        builder.HasIndex(p => p.ConnectionId);
        
        builder.HasOne(p => p.GameSession)
            .WithMany(g => g.Participants)
            .HasForeignKey(p => p.GameSessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
