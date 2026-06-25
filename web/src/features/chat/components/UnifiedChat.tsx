"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare, ArrowUp, LogIn, CheckCircle, ChevronDown, Lightbulb, FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ideaApi } from "@/features/ideas/api/ideas.api";
import { toast } from "sonner";
import { ChatMessage } from "./ChatMessage";
import { ChatMarkdown } from "./ChatMarkdown";
import { useIterationChat } from "../hooks/use-iteration-chat";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { Logo } from "./Logo";
import { IterationMessage } from "../types/models/chat";
import { useQueryClient } from "@tanstack/react-query";
import { useIdea } from "@/features/ideas/api/ideasQueries";

import { UnifiedChatProps } from "../types/components/UnifiedChat.types";
import { MIN_CHAR_COUNT } from "@/config/chat";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

export const UnifiedChat: FC<UnifiedChatProps> = ({ ideaId, onIdeaCreated, onArtifactUpdated }) => {
    // Auth state
    const { isAuthenticated, setIsAuthOpen, setAuthMode } = useAuth();

    // Shared state
    const [inputValue, setInputValue] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const queryClient = useQueryClient();
    const { data: idea } = useIdea(ideaId ?? undefined);

    const [streamedDesc, setStreamedDesc] = useState<string>("");
    const [isStreamingDesc, setIsStreamingDesc] = useState<boolean>(false);
    const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
    const [streamingDescError, setStreamingDescError] = useState<string | null>(null);

    // New idea mode state
    const [isCreating, setIsCreating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const dragCounter = useRef(0);

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

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            dragCounter.current++;
            setIsDraggingFile(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            setIsDraggingFile(false);
            dragCounter.current = 0;
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        dragCounter.current = 0;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === "pdf" || ext === "txt" || ext === "md") {
                await uploadSpecFile(file);
            } else {
                toast.error("Unsupported file type. Please upload a PDF, TXT, or MD file.");
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadSpecFile(file);
        }
    };

    const uploadSpecFile = async (file: File) => {
        if (!isAuthenticated) {
            setAuthMode("sign-in");
            setIsAuthOpen(true);
            return;
        }
        setIsUploading(true);
        setUploadError(null);
        try {
            const result = await ideaApi.uploadDocument(file);
            toast.success("Document analyzed and project initialized!");
            onIdeaCreated?.(result.id);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to parse document specification";
            setUploadError(msg);
            toast.error(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const renderDropZone = () => {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-4">
                {uploadError && (
                    <div className="p-3 rounded-xl bg-destructive/5 dark:bg-destructive/10 border border-destructive/10 dark:border-destructive/20 text-destructive text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <span className="font-medium">{uploadError}</span>
                        <button
                            onClick={() => setUploadError(null)}
                            className="ml-3 font-semibold hover:underline text-[10px] text-destructive/80 hover:text-destructive shrink-0 cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div
                    className={cn(
                        "group relative flex flex-col items-center justify-center border border-dashed rounded-2xl p-8 text-center transition-all duration-300 min-h-[180px]",
                        isUploading && "pointer-events-none opacity-80"
                    )}
                >
                    {isUploading ? (
                        <div className="space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground">Analyzing document details...</p>
                                <p className="text-[10px] text-muted-foreground">Extracting text and initializing your project specification</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-background border border-border/80 shadow-xs group-hover:border-primary/20 transition-colors w-fit mx-auto text-muted-foreground/60 group-hover:text-primary">
                                <UploadCloud className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground">
                                    Drag and drop your specification document
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Supports PDF, Markdown, and Text files up to 10MB
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Sync already existing businessDescription
    useEffect(() => {
        if (idea?.businessDescription && !streamedDesc) {
            setStreamedDesc(idea.businessDescription);
        }
    }, [idea?.businessDescription, streamedDesc]);

    // Stream business description if missing and status is draft
    useEffect(() => {
        if (!ideaId || !idea || idea.businessDescription || idea.status !== "draft" || isStreamingDesc) return;

        let active = true;
        setIsStreamingDesc(true);
        setStreamingDescError(null);
        setStreamedDesc("");

        ideaApi.streamBusinessDescription(ideaId, (data) => {
            if (!active) return;
            if (data.status === "error") {
                setStreamingDescError(data.message || "Failed to generate business description.");
                setIsStreamingDesc(false);
            } else if (data.status === "final") {
                setIsStreamingDesc(false);
                queryClient.invalidateQueries({ queryKey: ["ideas", ideaId] });
                queryClient.invalidateQueries({ queryKey: ["documents", "idea", ideaId] });
            } else if (data.chunk) {
                setStreamedDesc((prev) => prev + data.chunk);
            }
        }).catch((err) => {
            console.error("Error streaming business description in chat:", err);
            if (active) {
                setStreamingDescError(err.message || "Failed to stream business description.");
                setIsStreamingDesc(false);
            }
        });

        return () => {
            active = false;
        };
    }, [ideaId, idea, isStreamingDesc, queryClient]);

    const renderBusinessDescriptionStreaming = () => {
        if (!isStreamingDesc && !streamedDesc) return null;

        return (
            <div className="w-full max-w-2xl mx-auto mt-2.5 p-3.5 rounded-2xl border border-indigo-500/10 bg-linear-to-b from-indigo-500/5 via-violet-500/5 to-transparent space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-bl-none rounded-br-none translate-y-[11px] border-b-0">
                <div
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="flex items-center justify-between cursor-pointer group select-none px-1"
                >
                    <div className="flex items-center gap-2">
                        {isStreamingDesc ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        ) : (
                            <CheckCircle className="h-4 w-4 text-indigo-500" />
                        )}
                        <span className="text-[11px] font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                            {isStreamingDesc ? "PAD is refining business concept..." : "Business concept refined"}
                        </span>
                    </div>
                    <div className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {isDescExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <Lightbulb className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                        )}
                    </div>
                </div>

                {isDescExpanded && (
                    <div className="border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground select-text max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        <ChatMarkdown content={streamedDesc} />
                        {isStreamingDesc && <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary/70 animate-pulse align-middle" />}
                    </div>
                )}
            </div>
        );
    };

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
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-2.5 z-20">
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
                {uploadError && (
                    <div className="p-3 rounded-xl bg-destructive/5 dark:bg-destructive/10 border border-destructive/10 dark:border-destructive/20 text-destructive text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <span className="font-medium">{uploadError}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadError(null);
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
                        <div className="flex items-center gap-2">
                            {/* Hidden file input */}
                            {isNewMode && (
                                <input
                                    id="spec-file-input"
                                    type="file"
                                    accept=".pdf,.txt,.md"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    disabled={isUploading}
                                />
                            )}

                            {/* Upload Button */}
                            {isNewMode && (
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        document.getElementById("spec-file-input")?.click();
                                    }}
                                    disabled={isUploading || isSubmitting}
                                    size="icon"
                                    className={`group/upload-btn h-8 rounded-full shrink-0 transition-all duration-300 flex items-center gap-0 cursor-pointer overflow-hidden
                                        ${(isUploading || isSubmitting)
                                            ? "w-8 justify-center pl-0 bg-muted text-muted-foreground/35 opacity-70 cursor-not-allowed"
                                            : "w-8 justify-start pl-2 bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow hover:shadow-indigo-500/20 hover:w-[82px]"
                                        }`}
                                    aria-label="Upload document"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UploadCloud className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/upload-btn:-translate-y-0.5" />
                                            <span className="max-w-0 opacity-0 overflow-hidden font-semibold text-[10.5px] tracking-wide transition-all duration-300 ease-in-out group-hover/upload-btn:max-w-[48px] group-hover/upload-btn:opacity-100 ml-0 group-hover/upload-btn:ml-1.5 text-inherit whitespace-nowrap">
                                                Upload
                                            </span>
                                        </>
                                    )}
                                </Button>
                            )}

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
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Send Button */}
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering container focus again
                                    handleSend();
                                }}
                                disabled={isDisabled || isUploading}
                                size="icon"
                                className={`group/btn h-8 rounded-full shrink-0 transition-all duration-300 flex items-center gap-0 cursor-pointer overflow-hidden
                                    ${(isDisabled || isUploading)
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
            </div>
        );
    };

    return (
        <div
            onDragEnter={isNewMode ? handleDragEnter : undefined}
            onDragOver={isNewMode ? handleDragOver : undefined}
            onDragLeave={isNewMode ? handleDragLeave : undefined}
            onDrop={isNewMode ? handleDrop : undefined}
            className="flex flex-col h-full bg-background relative"
        >
            {/* Drag & Drop Absolute Overlay */}
            {isNewMode && isDraggingFile && (
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="absolute inset-0 bg-background/85 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-2xl z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200"
                >
                    <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 animate-bounce">
                        <UploadCloud className="h-8 w-8" />
                    </div>
                    <div className="space-y-1 text-center">
                        <p className="text-sm font-bold text-foreground">Drop document to initialize project</p>
                        <p className="text-xs text-muted-foreground">Supports PDF, Markdown, and Text files up to 10MB</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
                <div
                    className={`w-2 h-2 rounded-full ${error ? "bg-destructive animate-pulse" :
                        (aiPhase !== "idle" || isCreating) ? "bg-violet-500 animate-pulse" :
                            "bg-indigo-500 animate-pulse"
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

                        {/* Centered Area */}
                        <div className="w-full space-y-4">
                            {isUploading ? (
                                <div className="w-full max-w-2xl mx-auto p-8 border border-border/80 rounded-2xl bg-muted/10 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                    <div className="space-y-1 text-center">
                                        <p className="text-xs font-semibold text-foreground">Analyzing document details...</p>
                                        <p className="text-[10px] text-muted-foreground">Extracting text and initializing your project specification</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Centered Input Box */}
                                    <div className="w-full">
                                        {renderBusinessDescriptionStreaming()}
                                        {renderInputBox()}
                                    </div>

                                    {/* Suggestions */}
                                    <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl mx-auto">
                                        {[
                                            "I want to build a ",
                                            "The target users are ",
                                            "Key features include ",
                                        ].map((hint) => (
                                            <button
                                                key={hint}
                                                onClick={() => setInputValue(prev => prev ? prev + " " + hint.trim() : hint.trim())}
                                                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                            >
                                                {hint.trim()}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
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
                    {renderBusinessDescriptionStreaming()}
                    {renderInputBox()}
                </div>
            )}
        </div>
    );
};
