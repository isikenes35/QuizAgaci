export interface PendingAnswer {
  answerId: string;
  nickname: string;
  textAnswer: string | null;
}

export interface ReviewAnswerData {
  isCorrect: boolean;
  scoreAwarded: number;
}
