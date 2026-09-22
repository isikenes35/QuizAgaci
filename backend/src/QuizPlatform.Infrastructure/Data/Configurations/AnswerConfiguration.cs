using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizPlatform.Domain.Entities;

namespace QuizPlatform.Infrastructure.Data.Configurations;

public class AnswerConfiguration : IEntityTypeConfiguration<Answer>
{
    public void Configure(EntityTypeBuilder<Answer> builder)
    {
        builder.HasKey(a => a.Id);
        
        builder.HasIndex(a => new { a.GameSessionId, a.QuestionId, a.ParticipantId }).IsUnique();
        builder.HasIndex(a => a.ParticipantId);
        builder.HasIndex(a => a.ReviewStatus);
        
        builder.HasOne(a => a.GameSession)
            .WithMany(g => g.Answers)
            .HasForeignKey(a => a.GameSessionId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasOne(a => a.Participant)
            .WithMany(p => p.Answers)
            .HasForeignKey(a => a.ParticipantId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.HasOne(a => a.Question)
            .WithMany()
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
