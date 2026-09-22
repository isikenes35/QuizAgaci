import { create } from 'zustand';
import type { GameSession, GameParticipant } from '../types/game.types';

interface GameStore {
  session: GameSession | null;
  participants: GameParticipant[];
  isHost: boolean;
  participantId: string | null;

  // Phase 4 states
  currentQuestion: any | null;
  timeLimit: number;
  timeRemaining: number;
  isQuestionActive: boolean;
  answersCount: number;

  // Phase 5 & 6 states
  leaderboard: any[];
  questionResults: any | null;
  needsManualReview: boolean;
  isImageHidden: boolean;

  setSession: (session: GameSession | null) => void;
  setParticipants: (participants: GameParticipant[]) => void;
  addParticipant: (participant: GameParticipant) => void;
  setIsHost: (isHost: boolean) => void;
  setParticipantId: (id: string | null) => void;

  setCurrentQuestion: (question: any, timeLimit: number) => void;
  updateTimer: (remaining: number) => void;
  endQuestion: () => void;
  incrementAnswerCount: () => void;

  setLeaderboard: (leaderboard: any[]) => void;
  setQuestionResults: (results: any) => void;
  setNeedsManualReview: (needs: boolean) => void;
  setIsImageHidden: (hidden: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  session: null,
  participants: [],
  isHost: false,
  participantId: null,

  currentQuestion: null,
  timeLimit: 0,
  timeRemaining: 0,
  isQuestionActive: false,
  answersCount: 0,

  leaderboard: [],
  questionResults: null,
  needsManualReview: false,
  isImageHidden: false,

  setSession: (session) => set({ session }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) => set((state) => ({ 
    participants: [...state.participants.filter(p => p.id !== participant.id), participant] 
  })),
  setIsHost: (isHost) => set({ isHost }),
  setParticipantId: (id) => set({ participantId: id }),

  setCurrentQuestion: (question, timeLimit) => set({ 
    currentQuestion: question, 
    timeLimit, 
    timeRemaining: timeLimit, 
    isQuestionActive: true,
    answersCount: 0,
    questionResults: null,
    needsManualReview: false,
    isImageHidden: false
  }),
  updateTimer: (remaining) => set({ timeRemaining: remaining }),
  endQuestion: () => set({ isQuestionActive: false }),
  incrementAnswerCount: () => set((state) => ({ answersCount: state.answersCount + 1 })),

  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setQuestionResults: (results) => set({ questionResults: results }),
  setNeedsManualReview: (needs) => set({ needsManualReview: needs }),
  setIsImageHidden: (hidden) => set({ isImageHidden: hidden })
}));

