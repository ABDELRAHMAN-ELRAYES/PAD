export interface IDiscoveryQuestion {
  id: string;
  questionKey: string;
  questionText: string;
  questionType: string;
  options?: string[] | null;
  position: number;
  label?: string;
  key?: string;
  type?: string;
  required?: boolean;
}

export interface IDiscoveryQuestionnaire {
  id: string;
  ideaId: string;
  generatedAt: Date;
  questions: IDiscoveryQuestion[];
}

export interface IDiscoveryAnswer {
  id: string;
  questionId: string;
  answerValue: any;
  submittedAt: Date;
}
