export interface GameSession {
  id: string;
  quizId: string;
  hostUserId: string;
  gameCode: string;
  status: 'Lobby' | 'Running' | 'Paused' | 'Finished';
  createdAt: string;
}

export interface GameParticipant {
  id: string;
  nickname: string;
  totalScore: number;
  isConnected: boolean;
}

export interface JoinGameData {
  gameCode: string;
  nickname: string;
}
