"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, ArrowUp, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ideaApi, planApi } from "@/lib/api";
import { ChatMessage } from "@/components/features/iteration/ChatMessage";
import { ChatMarkdown } from "@/components/features/iteration/ChatMarkdown";
import { PlanCard } from "@/components/features/iteration/PlanCard";
import { useIterationChat } from "@/hooks/use-iteration-chat";
import { AiStatusIndicator, AiPhase } from "@/components/features/iteration/AiStatusIndicator";
import Logo from "@/components/logo";

interface UnifiedChatProps {
    /** null = new idea mode; string = iteration mode for existing idea */
    ideaId: string | null;
    onIdeaCreated?: (ideaId: string) => void;
    onArtifactUpdated?: () => void;
}

const MIN_CHAR_COUNT = 20;

export const UnifiedChat: FC<UnifiedChatProps> = ({ ideaId, onIdeaCreated, onArtifactUpdated }) => {
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
        activePlan,
        error: chatError,
        sendMessage,
        confirmPlan,
        dismissPlan,
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
                            : "Ask PAD anything about your project..."
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
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
                <div 
                    className={`w-2 h-2 rounded-full ${
                        error ? "bg-destructive animate-pulse" :
                        (aiPhase !== "idle" || isCreating) ? "bg-violet-500 animate-pulse" :
                        "bg-green-500 animate-pulse"
                    }`}
                />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    PAD Assistant
                </span>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 workspace-panel" onScroll={handleScroll}>
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
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <MessageSquare className="h-6 w-6 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm mb-1">
                                Chat with PAD
                            </h3>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Ask questions about your project, request changes to
                                documents, diagrams, features, or workflows.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                            {[
                                "Explain the architecture",
                                "Why did you choose this tech stack?",
                                "Add authentication feature",
                                "Update the ERD",
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
                    <div className="space-y-6">
                        {messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                ideaId={ideaId!}
                                onSuggestionApproved={onArtifactUpdated}
                            />
                        ))}

                        {/* Modification Plan Card */}
                        {activePlan && (
                            <div className="mt-4 w-full">
                                <PlanCard
                                    plan={activePlan}
                                    ideaId={ideaId!}
                                    onConfirm={confirmPlan}
                                    onRollback={async (planId) => {
                                        await planApi.rollback(ideaId!, planId);
                                        onArtifactUpdated?.();
                                    }}
                                    onDismiss={dismissPlan}
                                />
                            </div>
                        )}

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

            {/* Error */}
            {error && (
                <div className="mx-4 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs absolute bottom-16 left-0 right-0 z-10 shadow-sm">
                    {error}
                    <button
                        onClick={dismissError}
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
