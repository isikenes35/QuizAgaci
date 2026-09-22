using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using QuizPlatform.Application.DTOs.Answer;

namespace QuizPlatform.Application.Interfaces;

public interface IAnswerService
{
    Task<AnswerResponseDto> SubmitAnswerAsync(Guid participantId, SubmitAnswerDto dto);
    
    Task<IEnumerable<PendingAnswerDto>> GetPendingAnswersAsync(Guid sessionId, Guid hostUserId);
    Task ReviewAnswerAsync(Guid answerId, Guid hostUserId, ReviewAnswerDto dto);
    Task ResumeFromReviewAsync(Guid sessionId, Guid hostUserId);
}
