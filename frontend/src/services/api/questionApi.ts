import api from './axiosConfig';
import type { Question, CreateQuestionData } from '../../types/question.types';

const toPascalCase = (data: CreateQuestionData) => ({
  Type: data.type,
  QuestionText: data.questionText,
  Options: data.options.map(opt => ({
    OptionText: opt.optionText,
    IsCorrect: opt.isCorrect
  })),
  TimeLimit: data.timeLimit,
  MaxScore: data.maxScore,
  MinScore: data.minScore,
  SpeedBonusEnabled: data.speedBonusEnabled,
  ImagePath: data.imagePath,
  ExplanationText: data.explanationText,
  ImageVisibilityDuration: data.imageVisibilityDuration,
  HideImageAfterTimer: data.hideImageAfterTimer || false,
  RequiresManualReview: data.requiresManualReview || false,
  AllowAlternativeAnswer: data.allowAlternativeAnswer || false,
});

export const getQuestions = async (quizId: string): Promise<Question[]> => {
  const response = await api.get(`/quizzes/${quizId}/questions`);
  return response.data;
};

export const createQuestion = async (quizId: string, data: CreateQuestionData): Promise<Question> => {
  const response = await api.post(`/quizzes/${quizId}/questions`, toPascalCase(data));
  return response.data;
};

export const updateQuestion = async (questionId: string, data: CreateQuestionData): Promise<Question> => {
  const response = await api.put(`/questions/${questionId}`, toPascalCase(data));
  return response.data;
};

export const deleteQuestion = async (questionId: string): Promise<void> => {
  await api.delete(`/questions/${questionId}`);
};

export const reorderQuestions = async (quizId: string, questionIds: string[]): Promise<void> => {
  await api.patch(`/quizzes/${quizId}/questions/reorder`, questionIds);
};

