import api from './axiosConfig';
import type { PendingAnswer, ReviewAnswerData } from '../../types/answer.types';

export const getPendingAnswers = async (sessionId: string): Promise<PendingAnswer[]> => {
  const response = await api.get(`/answers/session/${sessionId}/pending`);
  return response.data;
};

export const reviewAnswer = async (answerId: string, data: ReviewAnswerData): Promise<void> => {
  await api.patch(`/answers/${answerId}/review`, data);
};

export const resumeFromReview = async (sessionId: string): Promise<void> => {
  await api.post(`/answers/session/${sessionId}/resume-from-review`);
};
