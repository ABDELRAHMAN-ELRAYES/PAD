export type IdeaStatus =
  | "draft"
  | "questionnaire_ready"
  | "questionnaire_complete"
  | "confirmed";

export interface IIdeaIntake {
  id: string;
  ideaId: string;
  rawText: string;
  refinedText: string | null;
  businessDescription: string | null;
  analysisResult: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIdea {
  id: string;
  userId: string;
  title: string | null;
  status: IdeaStatus;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rawText: string;
  refinedText: string | null;
  businessDescription: string | null;
  analysisResult?: any | null;
}
