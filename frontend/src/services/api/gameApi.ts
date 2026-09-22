import api from './axiosConfig';
import type { GameSession, GameParticipant, JoinGameData } from '../../types/game.types';

export const startGameSession = async (quizId: string): Promise<GameSession> => {
  const response = await api.post('/gamesessions/start', quizId, {
    headers: { 'Content-Type': 'application/json' }
  });
  return response.data;
};

export const getSessionById = async (id: string): Promise<GameSession> => {
  const response = await api.get('/gamesessions/' + id);
  return response.data;
};

export const getSessionByCode = async (gameCode: string): Promise<GameSession> => {
  const response = await api.get('/gamesessions/code/' + gameCode);
  return response.data;
};

export const getParticipants = async (sessionId: string): Promise<GameParticipant[]> => {
  const response = await api.get('/gamesessions/' + sessionId + '/participants');
  return response.data;
};

// Handled in AuthService in backend, but logically put here:
export const joinGame = async (data: JoinGameData): Promise<{ token: string }> => {
  const response = await api.post('/auth/join-game', data);
  return response.data;
};

export const getSessionState = async (id: string): Promise<any> => {
  const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
  const response = await api.get(`/gamesessions/${id}/state`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const hideImage = async (id: string): Promise<void> => {
  await api.post(`/gamesessions/${id}/hide-image`);
};

