import { create } from 'zustand';
import type { GameSession, GameParticipant } from '../types/game.types';

interface SessionStore {
  session: GameSession | null;
  participantsMap: Map<string, GameParticipant>;
  participants: GameParticipant[];
  isHost: boolean;
  participantId: string | null;

  setSession: (session: GameSession | null) => void;
  setParticipants: (participants: GameParticipant[]) => void;
  addParticipant: (participant: GameParticipant) => void;
  removeParticipant: (id: string) => void;
  getParticipantsList: () => GameParticipant[];
  setIsHost: (isHost: boolean) => void;
  setParticipantId: (id: string | null) => void;
  resetSession: () => void;
}

const toList = (map: Map<string, GameParticipant>): GameParticipant[] =>
  Array.from(map.values());

const toMap = (participants: GameParticipant[]): Map<string, GameParticipant> => {
  const map = new Map<string, GameParticipant>();
  for (const participant of participants) {
    map.set(participant.id, participant);
  }
  return map;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  participantsMap: new Map<string, GameParticipant>(),
  participants: [],
  isHost: false,
  participantId: null,

  setSession: (session) => set({ session }),

  setParticipants: (participants) => {
    const participantsMap = toMap(participants);
    set({ participantsMap, participants: toList(participantsMap) });
  },

  addParticipant: (participant) => {
    const participantsMap = new Map(get().participantsMap);
    participantsMap.set(participant.id, participant);
    set({ participantsMap, participants: toList(participantsMap) });
  },

  removeParticipant: (id) => {
    const current = get().participantsMap;
    if (!current.has(id)) return;
    const participantsMap = new Map(current);
    participantsMap.delete(id);
    set({ participantsMap, participants: toList(participantsMap) });
  },

  getParticipantsList: () => toList(get().participantsMap),

  setIsHost: (isHost) => set({ isHost }),
  setParticipantId: (participantId) => set({ participantId }),

  resetSession: () =>
    set({
      session: null,
      participantsMap: new Map<string, GameParticipant>(),
      participants: [],
      isHost: false,
      participantId: null
    })
}));
