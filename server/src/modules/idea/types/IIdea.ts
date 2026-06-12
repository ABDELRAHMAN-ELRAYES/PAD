import { IIdeaAnalysisResult } from "../../ai/types/IAi";

// Status type for ideas
export type IdeaStatus = "draft" | "confirmed";

// Base idea entity interface
export interface IIdea {
    id: string;
    userId: string;
    rawText: string;
    refinedText: string | null;
    status: IdeaStatus;
    analysisResult: IIdeaAnalysisResult | null;
    createdAt: Date;
    updatedAt: Date;
}

// Input for creating a new idea
export interface ICreateIdeaData {
    rawText: string;
    userId: string;
}

// Question and answer pair for clarifying questions
export interface IQuestionAnswer {
    question: string;
    answer: string;
}

// Input for updating/refining an idea
export interface IUpdateIdeaData {
    refinedText?: string;
    answers?: IQuestionAnswer[];
}

// Repository-specific data
export interface ICreateIdeaRepositoryData {
    rawText: string;
    userId: string;
}

export interface IUpdateIdeaRepositoryData {
    refinedText?: string;
    analysisResult?: IIdeaAnalysisResult;
    status?: IdeaStatus;
}

// Response type for API
export interface IIdeaResponse {
    id: string;
    rawText: string;
    refinedText: string | null;
    status: IdeaStatus;
    analysisResult: IIdeaAnalysisResult | null;
    createdAt: Date;
    updatedAt: Date;
}
