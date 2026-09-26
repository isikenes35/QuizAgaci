export type QuestionType = 'MultipleChoice' | 'MultipleSelect' | 'OpenEnded' | 'TrueFalse' | 'ImageQuestion' | 'MapQuestion';

export interface Question {
  id: string;
  quizId: string;
  orderIndex: number;
  type: QuestionType;
  questionText: string;
  imagePath: string | null;
  explanationText: string | null;
  timeLimit: number | null;
  maxScore: number | null;
  minScore: number | null;
  speedBonusEnabled: boolean | null;
  imageVisibilityDuration: number | null;
  hideImageAfterTimer: boolean;
  requiresManualReview: boolean;
  allowAlternativeAnswer: boolean;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  orderIndex: number;
  optionText: string;
  isCorrect: boolean;
}

export interface CreateQuestionData {
  type: QuestionType;
  questionText: string;
  options: { optionText: string; isCorrect: boolean }[];
  timeLimit?: number;
  maxScore?: number;
  minScore?: number;
  speedBonusEnabled?: boolean;
  imagePath?: string;
  explanationText?: string;
  imageVisibilityDuration?: number;
  hideImageAfterTimer?: boolean;
  requiresManualReview?: boolean;
  allowAlternativeAnswer?: boolean;
}
