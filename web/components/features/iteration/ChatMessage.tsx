"use client";

import { FC } from "react";
import { User, Bot } from "lucide-react";
import { IterationMessage } from "@/lib/types/idea";
import { SuggestionCard } from "./SuggestionCard";

interface ChatMessageProps {
    message: IterationMessage;
    ideaId: string;
    onSuggestionApproved?: (suggestionId: string) => void;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message, ideaId, onSuggestionApproved }) => {
    const isUser = message.role === "user";
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300"
                }`}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Message Bubble */}
            <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{time}</span>

                {/* Suggestion Card (assistant only) */}
                {!isUser && message.suggestion && (
                    <div className="mt-2 w-full">
                        <SuggestionCard
                            suggestion={message.suggestion}
                            ideaId={ideaId}
                            onApproved={onSuggestionApproved}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
