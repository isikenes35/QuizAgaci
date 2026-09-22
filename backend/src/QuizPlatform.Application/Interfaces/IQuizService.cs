using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using QuizPlatform.Application.DTOs.Quiz;
using QuizPlatform.Application.DTOs.Question;

namespace QuizPlatform.Application.Interfaces;

public interface IQuizService
{
    Task<IEnumerable<QuizDto>> GetUserQuizzesAsync(Guid userId);
    Task<QuizDto?> GetQuizByIdAsync(Guid id, Guid userId);
    Task<QuizDto> CreateQuizAsync(Guid userId, CreateQuizDto dto);
    Task<QuizDto> UpdateQuizAsync(Guid id, Guid userId, UpdateQuizDto dto);
    Task DeleteQuizAsync(Guid id, Guid userId);
    Task<QuizDto> DuplicateQuizAsync(Guid id, Guid userId);
    
    // Questions
    Task<IEnumerable<QuestionDto>> GetQuizQuestionsAsync(Guid quizId, Guid userId);
    Task<QuestionDto> AddQuestionAsync(Guid quizId, Guid userId, CreateQuestionDto dto);
    Task<QuestionDto> UpdateQuestionAsync(Guid questionId, Guid userId, CreateQuestionDto dto);
    Task DeleteQuestionAsync(Guid questionId, Guid userId);
    Task ReorderQuestionsAsync(Guid quizId, Guid userId, List<Guid> questionIds);
}
