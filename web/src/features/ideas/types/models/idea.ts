// Idea status type
export type IdeaStatus = "draft" | "confirmed";

// AI Analysis result schema
export interface IIdeaAnalysisResult {
    missingDetails: string[];
    complementarySuggestions: string[];
    constraintsAndRisks: string[];
    clarifyingQuestions: string[];
}

// Base idea entity interface
export interface Idea {
    id: string;
    rawText: string;
    refinedText: string | null;
    status: IdeaStatus;
    analysisResult: IIdeaAnalysisResult | null;
    createdAt: string;
    updatedAt: string;
}

// Input for creating a new idea
export interface CreateIdeaInput {
    rawText: string;
}

// Question and answer pair for clarifying questions
export interface IQuestionAnswer {
    question: string;
    answer: string;
}

// Input for refining an idea
export interface RefineIdeaInput {
    refinedText?: string;
    answers?: IQuestionAnswer[];
}

// API Response types
export interface ApiResponse<T> {
    status: "success" | "fail" | "error";
    message?: string;
    data?: T;
}

export interface IdeaResponse {
    idea: Idea;
}

export interface IdeasListResponse {
    ideas: Idea[];
    count: number;
}
