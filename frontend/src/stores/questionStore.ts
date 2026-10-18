import { create } from 'zustand';
import { useResultsStore } from './resultsStore';

interface QuestionStore {
  currentQuestion: any | null;
  timeLimit: number;
  timeRemaining: number;
  isQuestionActive: boolean;
  answersCount: number;
  isImageHidden: boolean;

  setCurrentQuestion: (question: any, timeLimit: number) => void;
  updateTimer: (remaining: number) => void;
  endQuestion: () => void;
  incrementAnswerCount: () => void;
  setAnswersCount: (count: number) => void;
  setIsImageHidden: (hidden: boolean) => void;
  resetQuestion: () => void;
}

export const useQuestionStore = create<QuestionStore>((set) => ({
  currentQuestion: null,
  timeLimit: 0,
  timeRemaining: 0,
  isQuestionActive: false,
  answersCount: 0,
  isImageHidden: false,

  setCurrentQuestion: (question, timeLimit) => {
    set({
      currentQuestion: question,
      timeLimit,
      timeRemaining: timeLimit,
      isQuestionActive: question != null,
      answersCount: 0,
      isImageHidden: false
    });
    useResultsStore.getState().clearQuestionResults();
    useResultsStore.getState().setNeedsManualReview(false);
  },

  updateTimer: (remaining) =>
    set((state) => ({
      timeRemaining: remaining,
      timeLimit: remaining > state.timeLimit ? remaining : state.timeLimit
    })),

  endQuestion: () => set({ isQuestionActive: false }),

  incrementAnswerCount: () => set((state) => ({ answersCount: state.answersCount + 1 })),
  setAnswersCount: (answersCount) => set({ answersCount }),
  setIsImageHidden: (isImageHidden) => set({ isImageHidden }),

  resetQuestion: () =>
    set({
      currentQuestion: null,
      timeLimit: 0,
      timeRemaining: 0,
      isQuestionActive: false,
      answersCount: 0,
      isImageHidden: false
    })
}));
