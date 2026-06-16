"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, ArrowUp, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ideaApi } from "@/features/ideas/api/ideas.api";
import { ChatMessage } from "./ChatMessage";
import { ChatMarkdown } from "./ChatMarkdown";
import { useIterationChat } from "../hooks/use-iteration-chat";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { Logo } from "./Logo";
import { IterationMessage } from "../types/models/chat";

import { UnifiedChatProps } from "../types/components/UnifiedChat.types";
import { MIN_CHAR_COUNT } from "@/config/chat";
import { useAuth } from "@/features/auth/hooks/use-auth";

export const UnifiedChat: FC<UnifiedChatProps> = ({ ideaId, onIdeaCreated, onArtifactUpdated }) => {
    // Auth state
    const { isAuthenticated, setIsAuthOpen, setAuthMode } = useAuth();

    // Shared state
    const [inputValue, setInputValue] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // New idea mode state
    const [isCreating, setIsCreating] = useState(false);

    // Iteration mode — socket-based hook with optimistic UI
    const {
        messages,
        streamingText,
        isLoading,
        isSending,
        aiPhase,
        error: chatError,
        sendMessage,
        clearError,
    } = useIterationChat(ideaId, onArtifactUpdated);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const error = localError || chatError;

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

    const [isAtBottom, setIsAtBottom] = useState(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // 50px tolerance
        const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
        setIsAtBottom(isBottom);
    };

    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [messages, streamingText, aiPhase, scrollToBottom, isAtBottom]);

    // Handle sending
    const handleSend = async () => {
        if (!isAuthenticated) {
            setAuthMode("sign-in");
            setIsAuthOpen(true);
            return;
        }

        const content = inputValue.trim();
        if (!content) return;

        if (!ideaId) {
            // NEW IDEA MODE
            if (content.length < MIN_CHAR_COUNT) {
                setLocalError(`Idea must be at least ${MIN_CHAR_COUNT} characters`);
                return;
            }
            setIsCreating(true);
            setLocalError(null);
            setInputValue("");
            try {
                const idea = await ideaApi.create({ rawText: content });
                onIdeaCreated?.(idea.id);
            } catch (err) {
                setLocalError(
                    err instanceof Error ? err.message : "Failed to create idea"
                );
                setInputValue(content);
            } finally {
                setIsCreating(false);
            }
        } else {
            // ITERATION MODE — optimistic send via hook
            setLocalError(null);
            setInputValue("");
            try {
                await sendMessage(content);
                scrollToBottom();
                setIsAtBottom(true);
            } catch {
                // Error handled in hook; restore input
                setInputValue(content);
            }
            inputRef.current?.focus();
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

    const dismissError = () => {
        setLocalError(null);
        clearError();
    };

    const isNewMode = !ideaId;
    const charCount = inputValue.length;
    const isSubmitting = isCreating || isSending;

    // Render the actual input box
    const renderInputBox = () => {
        const isInputEmpty = !inputValue.trim();
        const isDisabled = isSubmitting || (isAuthenticated && (isInputEmpty || (isNewMode && charCount < MIN_CHAR_COUNT)));

        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-2.5">
                {error && (
                    <div className="p-3 rounded-xl bg-destructive/5 dark:bg-destructive/10 border border-destructive/10 dark:border-destructive/20 text-destructive text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <span className="font-medium">{error}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissError();
                            }}
                            className="ml-3 font-semibold hover:underline text-[10px] text-destructive/80 hover:text-destructive shrink-0 cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div
                    className="group relative flex flex-col w-full rounded-2xl border border-border/80 bg-muted/20 dark:bg-muted/10 hover:border-border focus-within:border-primary/40 focus-within:bg-background focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 ease-out cursor-text"
                    onClick={() => inputRef.current?.focus()}
                >
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isNewMode
                                ? "Describe your software idea..."
                                : "Ask PAD anything about your project..."
                        }
                        disabled={isSubmitting}
                        rows={1}
                        className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm focus:outline-none placeholder:text-muted-foreground/45 min-h-[44px] max-h-[220px] overflow-y-auto custom-scrollbar"
                        style={{ lineHeight: "1.5" }}
                    />

                    <div className="flex items-center justify-between px-3.5 pb-2 pt-0.5 bg-transparent select-none">
                        {/* Helper text inside the box */}
                        <div className="text-[10px] tracking-wide text-muted-foreground/50 font-normal px-1">
                            {!isAuthenticated ? (
                                <span>Please sign in to submit your idea</span>
                            ) : isNewMode ? (
                                <span>
                                    {charCount > 0 && charCount < MIN_CHAR_COUNT
                                        ? `${MIN_CHAR_COUNT - charCount} more characters required`
                                        : charCount > 0
                                            ? `${charCount} characters`
                                            : "Ctrl+Enter to submit"}
                                </span>
                            ) : (
                                <span>Enter to send · Shift+Enter for newline</span>
                            )}
                        </div>

                        {/* Send Button */}
                        <Button
                            onClick={(e) => {
                                e.stopPropagation(); // Avoid triggering container focus again
                                handleSend();
                            }}
                            disabled={isDisabled}
                            size="icon"
                            className={`group/btn h-8 rounded-full shrink-0 transition-all duration-300 flex items-center gap-0 cursor-pointer overflow-hidden
                                ${isDisabled
                                    ? "w-8 justify-center pl-0 bg-muted text-muted-foreground/35 opacity-70 cursor-not-allowed"
                                    : `w-8 justify-start pl-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow hover:shadow-primary/20 ${!isAuthenticated
                                        ? "hover:w-[85px]"
                                        : isNewMode
                                            ? "hover:w-[82px]"
                                            : "hover:w-[70px]"
                                    }`
                                }`}
                            aria-label={!isAuthenticated ? "Sign In" : isNewMode ? "Submit idea" : "Send message"}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {!isAuthenticated ? (
                                        <LogIn className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
                                    ) : isNewMode ? (
                                        <ArrowUp className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
                                    ) : (
                                        <Send className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                    )}
                                    <span className="max-w-0 opacity-0 overflow-hidden font-semibold text-[10.5px] tracking-wide transition-all duration-300 ease-in-out group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 ml-0 group-hover/btn:ml-1.5 text-inherit whitespace-nowrap">
                                        {!isAuthenticated ? "Sign In" : isNewMode ? "Submit" : "Send"}
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
                <div
                    className={`w-2 h-2 rounded-full ${error ? "bg-destructive animate-pulse" :
                        (aiPhase !== "idle" || isCreating) ? "bg-violet-500 animate-pulse" :
                            "bg-green-500 animate-pulse"
                        }`}
                />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    PAD Assistant
                </span>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 workspace-panel custom-scrollbar" onScroll={handleScroll}>
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
                ) : messages.length === 0 && !streamingText && aiPhase === "idle" ? (
                    /* ITERATION — No messages yet */
                    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-4 max-w-sm mx-auto py-12 select-none">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-sm text-foreground">
                                Chat with PAD
                            </h3>
                            <p className="text-xs text-muted-foreground leading-normal max-w-xs mx-auto">
                                Ask questions about your project: documents, diagrams, features, or workflows.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* ITERATION — Messages */
                    <div className="space-y-6">
                        {messages.map((msg: IterationMessage) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                            />
                        ))}

                        {/* Unified Assistant Pending Slot */}
                        {(aiPhase !== "idle" && aiPhase !== "error" || streamingText) && (
                            <div className="flex flex-row items-start w-full gap-3 mt-4">
                                <div className="shrink-0 pt-0.5">
                                    <AiStatusIndicator
                                        phase={aiPhase !== "idle" ? aiPhase : (streamingText ? "generating" : "idle")}
                                        label={aiPhase === "thinking" ? "PAD is thinking..." : aiPhase === "editing" ? "Updating project…" : undefined}
                                    />
                                </div>

                                {streamingText && (
                                    <div className="flex-1 text-sm text-chat-assistant-fg min-w-0">
                                        <ChatMarkdown content={streamingText} />
                                        <span className="inline-block w-1.5 h-4 ml-1 bg-muted-foreground animate-pulse align-middle" />
                                    </div>
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error is now handled inside renderInputBox to avoid overlay bugs and keep layout clean */}

            {/* Iteration Mode Input area (Fixed at bottom) */}
            {!isNewMode && (
                <div className="border-t bg-background px-3 py-2.5 shrink-0">
                    {renderInputBox()}
                </div>
            )}
        </div>
    );
};
