import { IterationMessage } from "../models/chat";

export interface ChatMessageProps {
    message: IterationMessage;
    ideaId: string;
    onSuggestionApproved?: (suggestionId: string) => void;
}
