import { IterationMessage } from "@/lib/types/idea";

export interface ChatMessageProps {
    message: IterationMessage;
    ideaId: string;
    onSuggestionApproved?: (suggestionId: string) => void;
}
