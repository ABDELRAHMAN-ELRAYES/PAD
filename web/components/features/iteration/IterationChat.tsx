"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iterationApi } from "@/lib/api";
import { IterationSession, IterationMessage } from "@/lib/types/idea";
import { ChatMessage } from "./ChatMessage";

interface IterationChatProps {
    ideaId: string;
}

export const IterationChat: FC<IterationChatProps> = ({ ideaId }) => {
    const [session, setSession] = useState<IterationSession | null>(null);
    const [messages, setMessages] = useState<IterationMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Load session
    const fetchSession = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        setError(null);
        try {
            const data = await iterationApi.getSession(ideaId);
            setSession(data);
            setMessages(data.messages || []);
        } catch (err) {
            // 404 means no session yet — that's fine for initial load
            if (err instanceof Error && err.message.includes("not found")) {
                setSession(null);
                setMessages([]);
            } else if (!silent) {
                setError(err instanceof Error ? err.message : "Failed to load session");
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Start polling for new messages after sending
    const startPolling = useCallback(() => {
        if (pollingRef.current) return;
        setIsPolling(true);
        pollingRef.current = setInterval(async () => {
            await fetchSession(true);
        }, 3000);
    }, [fetchSession]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Stop polling when an assistant message arrives after user message
    useEffect(() => {
        if (messages.length > 0 && isPolling) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === "assistant") {
                stopPolling();
            }
        }
    }, [messages, isPolling, stopPolling]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => stopPolling();
    }, [stopPolling]);

    const handleSend = async () => {
        const content = inputValue.trim();
        if (!content || isSending) return;

        setSending(true);
        setError(null);
        setInputValue("");

        try {
            const newMessage = await iterationApi.sendMessage(ideaId, content);
            setMessages((prev) => [...prev, newMessage]);
            // Start polling for AI response
            startPolling();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send message");
            setInputValue(content); // Restore input on error
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestionApproved = () => {
        // Refresh session to get updated suggestion statuses
        fetchSession(true);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Error banner */}
            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-2.5 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <MessageSquare className="h-8 w-8 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-1">Start Iterating</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Send a message to refine your idea, update documents, modify diagrams,
                                adjust features, or change workflow steps. PAD will analyze your feedback
                                and suggest actionable updates.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                            {[
                                "Update the ERD to include a settings table",
                                "Add authentication to the feature list",
                                "Simplify the user registration workflow",
                            ].map((hint) => (
                                <button
                                    key={hint}
                                    onClick={() => setInputValue(hint)}
                                    className="text-xs px-3 py-1.5 rounded-full border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                                >
                                    {hint}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatMessage
                            key={msg.id}
                            message={msg}
                            ideaId={ideaId}
                            onSuggestionApproved={handleSuggestionApproved}
                        />
                    ))
                )}

                {/* Typing indicator while polling */}
                {isPolling && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                        <span className="text-xs">PAD is thinking...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t bg-background px-4 py-3">
                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you'd like to update..."
                        className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
                        rows={1}
                        disabled={isSending}
                        aria-label="Chat message input"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending}
                        size="icon"
                        className="h-[44px] w-[44px] rounded-xl shrink-0"
                        aria-label="Send message"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    Press Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
};
