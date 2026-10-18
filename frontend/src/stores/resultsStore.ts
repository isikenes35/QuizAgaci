import { create } from 'zustand';

interface ResultsStore {
  leaderboard: any[];
  questionResults: any | null;
  needsManualReview: boolean;

  setLeaderboard: (leaderboard: any[]) => void;
  setQuestionResults: (results: any) => void;
  setNeedsManualReview: (needs: boolean) => void;
  clearQuestionResults: () => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsStore>((set) => ({
  leaderboard: [],
  questionResults: null,
  needsManualReview: false,

  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setQuestionResults: (questionResults) => set({ questionResults }),
  setNeedsManualReview: (needsManualReview) => set({ needsManualReview }),
  clearQuestionResults: () => set({ questionResults: null }),
  clearResults: () => set({ leaderboard: [], questionResults: null, needsManualReview: false })
}));
