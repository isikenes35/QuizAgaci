import { create } from 'zustand';
import type { GameSession, GameParticipant } from '../types/game.types';

interface GameStore {
  session: GameSession | null;
  participants: GameParticipant[];
  isHost: boolean;
  participantId: string | null;
  
  setSession: (session: GameSession | null) => void;
  setParticipants: (participants: GameParticipant[]) => void;
  addParticipant: (participant: GameParticipant) => void;
  setIsHost: (isHost: boolean) => void;
  setParticipantId: (id: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  session: null,
  participants: [],
  isHost: false,
  participantId: null,

  setSession: (session) => set({ session }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) => set((state) => ({ 
    participants: [...state.participants.filter(p => p.id !== participant.id), participant] 
  })),
  setIsHost: (isHost) => set({ isHost }),
  setParticipantId: (id) => set({ participantId: id })
}));
