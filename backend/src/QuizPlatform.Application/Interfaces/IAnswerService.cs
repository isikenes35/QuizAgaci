using System;
using System.Threading.Tasks;
using QuizPlatform.Application.DTOs.Answer;

namespace QuizPlatform.Application.Interfaces;

public interface IAnswerService
{
    Task<AnswerResponseDto> SubmitAnswerAsync(Guid participantId, SubmitAnswerDto dto);
}
