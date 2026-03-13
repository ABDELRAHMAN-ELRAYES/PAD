"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, RefreshCw, ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ideaApi, iterationApi } from "@/lib/api";
import { IterationSession, IterationMessage } from "@/lib/types/idea";
import { ChatMessage } from "@/components/features/iteration/ChatMessage";
import Logo from "@/components/logo";

interface UnifiedChatProps {
    /** null = new idea mode; string = iteration mode for existing idea */
    ideaId: string | null;
    onIdeaCreated?: (ideaId: string) => void;
}

const MIN_CHAR_COUNT = 20;
const MAX_CHAR_COUNT = 10000;

export const UnifiedChat: FC<UnifiedChatProps> = ({ ideaId, onIdeaCreated }) => {
    // Shared state
    const [inputValue, setInputValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // New idea mode state
    const [isCreating, setIsCreating] = useState(false);

    // Iteration mode state
    const [session, setSession] = useState<IterationSession | null>(null);
    const [messages, setMessages] = useState<IterationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [inputValue]);

    // Load iteration session when ideaId changes
    useEffect(() => {
        if (ideaId) {
            loadSession();
        } else {
            setMessages([]);
            setSession(null);
        }
    }, [ideaId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const loadSession = async () => {
        if (!ideaId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await iterationApi.getSession(ideaId);
            setSession(data);
            setMessages(data.messages || []);
        } catch (err) {
            if (err instanceof Error && err.message.includes("not found")) {
                setSession(null);
                setMessages([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Polling for AI responses
    const startPolling = useCallback(() => {
        if (pollingRef.current || !ideaId) return;
        setIsPolling(true);
        pollingRef.current = setInterval(async () => {
            try {
                const data = await iterationApi.getSession(ideaId);
                setSession(data);
                setMessages(data.messages || []);
            } catch { /* ignore */ }
        }, 3000);
    }, [ideaId]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
    }, []);

    useEffect(() => {
        if (messages.length > 0 && isPolling) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === "assistant") stopPolling();
        }
    }, [messages, isPolling, stopPolling]);

    useEffect(() => {
        return () => stopPolling();
    }, [stopPolling]);

    // Handle sending
    const handleSend = async () => {
        const content = inputValue.trim();
        if (!content) return;

        if (!ideaId) {
            // NEW IDEA MODE
            if (content.length < MIN_CHAR_COUNT) {
                setError(`Idea must be at least ${MIN_CHAR_COUNT} characters`);
                return;
            }
            setIsCreating(true);
            setError(null);
            setInputValue("");
            try {
                const idea = await ideaApi.create({ rawText: content });
                onIdeaCreated?.(idea.id);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to create idea"
                );
                setInputValue(content);
            } finally {
                setIsCreating(false);
            }
        } else {
            // ITERATION MODE
            setIsSending(true);
            setError(null);
            setInputValue("");
            try {
                const newMessage = await iterationApi.sendMessage(ideaId, content);
                setMessages((prev) => [...prev, newMessage]);
                startPolling();
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to send message"
                );
                setInputValue(content);
            } finally {
                setIsSending(false);
                inputRef.current?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!ideaId) {
            // New idea: Ctrl+Enter to submit
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isCreating) {
                e.preventDefault();
                handleSend();
            }
        } else {
            // Iteration: Enter to send (Shift+Enter for newline)
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        }
    };

    const handleSuggestionApproved = () => {
        if (ideaId) {
            loadSession();
        }
    };

    const isNewMode = !ideaId;
    const charCount = inputValue.length;
    const isSubmitting = isCreating || isSending;

    // Render the actual input box
    const renderInputBox = () => (
        <div className="w-full max-w-2xl mx-auto">
            <div className="relative flex items-end gap-2">
                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isNewMode
                            ? "Describe your software idea..."
                            : "Ask PAD to update anything..."
                    }
                    disabled={isSubmitting}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[200px] overflow-y-auto"
                    style={{ lineHeight: "1.5" }}
                />
                <Button
                    onClick={handleSend}
                    disabled={
                        !inputValue.trim() ||
                        isSubmitting ||
                        (isNewMode && charCount < MIN_CHAR_COUNT)
                    }
                    size="icon"
                    className="h-[40px] w-[40px] rounded-xl shrink-0"
                    aria-label={isNewMode ? "Submit idea" : "Send message"}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isNewMode ? (
                        <ArrowUp className="h-4 w-4" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-muted-foreground">
                {isNewMode ? (
                    <>
                        <span>
                            {charCount > 0 && charCount < MIN_CHAR_COUNT
                                ? `${MIN_CHAR_COUNT - charCount} more chars needed`
                                : charCount > 0
                                  ? `${charCount} characters`
                                  : ""}
                        </span>
                        <span>Ctrl+Enter to submit</span>
                    </>
                ) : (
                    <>
                        <span />
                        <span>Enter to send · Shift+Enter for new line</span>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 workspace-panel">
                {isNewMode ? (
                    /* NEW IDEA — Empty state (Centered Input) */
                    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-4">
                        <div className="flex flex-col items-center gap-4">
                            <Logo />
                            <div>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Describe your software idea and PAD will analyze it for
                                    you
                                </p>
                            </div>
                        </div>

                        {/* Centered Input Box */}
                        <div className="w-full">
                            {renderInputBox()}
                        </div>

                        {/* Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
                            {[
                                "I want to build a ",
                                "The target users are ",
                                "Key features include ",
                            ].map((hint) => (
                                <button
                                    key={hint}
                                    onClick={() => setInputValue(prev => prev ? prev + " " + hint.trim() : hint.trim())}
                                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    {hint.trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-xs text-muted-foreground">
                                Loading conversation...
                            </p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    /* ITERATION — No messages yet */
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <MessageSquare className="h-6 w-6 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm mb-1">
                                Chat with PAD
                            </h3>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Ask to update documents, modify diagrams, adjust
                                features, or refine your idea.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                            {[
                                "Add a settings table to the ERD",
                                "Add authentication feature",
                                "Simplify the registration flow",
                            ].map((hint) => (
                                <button
                                    key={hint}
                                    onClick={() => setInputValue(hint)}
                                    className="text-[11px] px-2.5 py-1 rounded-full border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                                >
                                    {hint}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ITERATION — Messages */
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                ideaId={ideaId!}
                                onSuggestionApproved={handleSuggestionApproved}
                            />
                        ))}

                        {/* Typing indicator */}
                        {isPolling && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                                    <RefreshCw className="h-3 w-3 animate-spin text-violet-500" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                                    <div className="flex gap-1">
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        />
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        />
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        />
                                    </div>
                                </div>
                                <span className="text-[10px]">PAD is thinking...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs absolute bottom-16 left-0 right-0 z-10 shadow-sm">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 underline text-[10px]"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Iteration Mode Input area (Fixed at bottom) */}
            {!isNewMode && (
                <div className="border-t bg-background px-3 py-2.5 shrink-0">
                    {renderInputBox()}
                </div>
            )}
        </div>
    );
};
