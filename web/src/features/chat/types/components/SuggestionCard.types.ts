import { IterationSuggestion } from "../models/chat";

export interface SuggestionCardProps {
    suggestion: IterationSuggestion;
    ideaId: string;
    onApproved?: (suggestionId: string) => void;
    onRejected?: (suggestionId: string) => void;
}
