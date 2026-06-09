import { IterationSuggestion } from "@/lib/types/idea";

export interface SuggestionCardProps {
    suggestion: IterationSuggestion;
    ideaId: string;
    onApproved?: (suggestionId: string) => void;
    onRejected?: (suggestionId: string) => void;
}
