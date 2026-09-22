export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  coverImagePath: string | null;
  language: string;
  status: 'Draft' | 'Published' | 'Archived';
  defaultTimeLimit: number;
  defaultMaxScore: number;
  defaultSpeedBonus: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuizData {
  title: string;
  description?: string;
  language: string;
  defaultTimeLimit: number;
  defaultMaxScore: number;
  defaultSpeedBonus: boolean;
}
