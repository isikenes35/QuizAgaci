import api from './axiosConfig';
import type { Quiz, CreateQuizData } from '../../types/quiz.types';

export const getQuizzes = async (): Promise<Quiz[]> => {
  const response = await api.get('/quizzes');
  return response.data;
};

export const getQuiz = async (id: string): Promise<Quiz> => {
  const response = await api.get('/quizzes/' + id);
  return response.data;
};

export const createQuiz = async (data: CreateQuizData): Promise<Quiz> => {
  const response = await api.post('/quizzes', data);
  return response.data;
};
