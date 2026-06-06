"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { iterationApi, planApi } from "@/lib/api";
import { IterationSession, IterationMessage, IterationSuggestion, ModificationPlan } from "@/lib/types/idea";
import { socket } from "@/lib/socket";
import { AiPhase } from "@/components/features/iteration/AiStatusIndicator";

interface UseIterationChatReturn {
    session: IterationSession | null;
    messages: IterationMessage[];
    streamingText: string | null;
    isLoading: boolean;
    isSending: boolean;
    isThinking: boolean; // Backcompat
    aiPhase: AiPhase;
    activePlan: ModificationPlan | null;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    confirmPlan: (planId: string) => Promise<void>;
    dismissPlan: () => void;
    clearError: () => void;
}

const OPTIMISTIC_PREFIX = "__opt_";
// Poll interval for REST fallback when socket streaming doesn't arrive
const POLL_INTERVAL_MS = 3000;
// Max number of polls before giving up
const MAX_POLLS = 40;

export function useIterationChat(ideaId: string | null, onArtifactUpdated?: () => void): UseIterationChatReturn {
    const [session, setSession] = useState<IterationSession | null>(null);
    const [messages, setMessages] = useState<IterationMessage[]>([]);
    const [streamingText, setStreamingText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
    const isThinking = aiPhase !== "idle" && aiPhase !== "error" && !streamingText;
    const [activePlan, setActivePlan] = useState<ModificationPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    const connectedIdeaRef = useRef<string | null>(null);
    const onArtifactUpdatedRef = useRef(onArtifactUpdated);
    onArtifactUpdatedRef.current = onArtifactUpdated;
    // Polling fallback refs
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollCountRef = useRef(0);
    const lastUserMsgCountRef = useRef(0);
    // Track if socket streaming is active
    const socketStreamActiveRef = useRef(false);

    const clearError = useCallback(() => setError(null), []);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollCountRef.current = 0;
    }, []);

    // Load session from REST API
    const loadSession = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await iterationApi.getSession(id);
            setSession(data);
            setMessages(data.messages || []);
        } catch (err) {
            if (err instanceof Error && err.message.includes("not found")) {
                setSession(null);
                setMessages([]);
            } else {
                setError(err instanceof Error ? err.message : "Failed to load session");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Start polling REST as fallback — keeps checking until assistant responds
    const startPolling = useCallback((id: string, userMsgCount: number) => {
        stopPolling();
        socketStreamActiveRef.current = false;
        pollCountRef.current = 0;
        lastUserMsgCountRef.current = userMsgCount;

        pollIntervalRef.current = setInterval(async () => {
            // If socket streaming kicked in, stop polling
            if (socketStreamActiveRef.current) {
                stopPolling();
                return;
            }

            pollCountRef.current++;
            if (pollCountRef.current > MAX_POLLS) {
                stopPolling();
                setAiPhase("error");
                setError("AI response timed out. Please try again.");
                return;
            }

            try {
                const data = await iterationApi.getSession(id);
                const msgs = data.messages || [];
                // Count how many assistant messages exist after last user message count
                const assistantMsgs = msgs.filter((m: IterationMessage) => m.role === "assistant");
                const userMsgs = msgs.filter((m: IterationMessage) => m.role === "user");

                // If we have more assistant msgs than user msgs sent before, AI responded
                if (assistantMsgs.length >= userMsgs.length && msgs.length > userMsgCount) {
                    setMessages(msgs);
                    setStreamingText(null);
                    setAiPhase("idle");
                    stopPolling();
                }
            } catch {
                // Silently continue polling
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling]);

    // Socket lifecycle
    useEffect(() => {
        if (!ideaId) {
            setSession(null);
            setMessages([]);
            setStreamingText(null);
            setAiPhase("idle");
            stopPolling();
            return;
        }

        loadSession(ideaId);
        connectedIdeaRef.current = ideaId;

        const joinRoom = () => {
            if (connectedIdeaRef.current) {
                console.log(`[Chat] Socket join room: ${connectedIdeaRef.current}`);
                socket.emit("join-room", connectedIdeaRef.current);
            }
        };

        // Register connect handler FIRST — handles initial connect + reconnects
        socket.on("connect", joinRoom);

        if (socket.connected) {
            joinRoom();
        } else {
            socket.connect();
        }

        // --- Event handlers ---

        const handleMessageNew = (message: IterationMessage) => {
            console.log(`[Chat] message:new role=${message.role} id=${message.id}`);

            if (message.role === "assistant") {
                setStreamingText(null);
                setAiPhase("idle");
                stopPolling();
            }

            setMessages(prev => {
                if (message.role === "user") {
                    const withoutOptimistic = prev.filter(m =>
                        !(m.id.startsWith(OPTIMISTIC_PREFIX) && m.role === "user" && m.content === message.content)
                    );
                    if (withoutOptimistic.some(m => m.id === message.id)) return withoutOptimistic;
                    return [...withoutOptimistic, message];
                }
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        };

        const handleMessageStream = (data: { sessionId: string; chunk?: string; fullText: string; type?: "chunk" | "done" }) => {
            socketStreamActiveRef.current = true;
            stopPolling();
            setAiPhase("generating");
            
            if (data.type === "done") {
                // Done event does not clear streaming text, message:new does that
                // Just in case, could handle it here
            }
            
            if (data.fullText) {
                setStreamingText(data.fullText);
            }
        };

        const handleMessageError = (data: { sessionId: string; error: string }) => {
            stopPolling();
            setStreamingText(null);
            setAiPhase("error");
            setError(`AI error: ${data.error}`);
        };

        const handleAiState = (data: { sessionId: string; phase: AiPhase; intent?: string }) => {
            if (data.phase === "idle") {
                setAiPhase("idle");
                setStreamingText(null);
            } else {
                setAiPhase(data.phase);
            }
        };

        const handleSuggestionNew = (suggestion: IterationSuggestion) => {
            setMessages(prev => {
                const updated = [...prev];
                for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === "assistant" && updated[i].id === suggestion.messageId) {
                        updated[i] = { ...updated[i], suggestion };
                        break;
                    }
                }
                return updated;
            });
        };

        const handleSuggestionStatus = (data: { id: string; status: string }) => {
            setMessages(prev =>
                prev.map(msg => {
                    if (msg.suggestion && msg.suggestion.id === data.id) {
                        return {
                            ...msg,
                            suggestion: { ...msg.suggestion, status: data.status as IterationSuggestion["status"] }
                        };
                    }
                    return msg;
                })
            );
        };

        const handleArtifactUpdated = () => {
            onArtifactUpdatedRef.current?.();
        };

        // Plan lifecycle events
        const handlePlanCreated = (data: { plan: ModificationPlan }) => {
            setActivePlan(data.plan);
            setAiPhase("idle");
        };

        const handlePlanComplete = (data: { planId: string; status: string }) => {
            setActivePlan(prev => prev && prev.id === data.planId ? { ...prev, status: data.status as any } : prev);
            setAiPhase("idle");
            onArtifactUpdatedRef.current?.();
        };

        const handlePlanFailed = (data: { planId: string; error: string }) => {
            setActivePlan(prev => prev && prev.id === data.planId ? { ...prev, status: "failed" } : prev);
            setAiPhase("error");
            setError(`Plan failed: ${data.error}`);
        };

        socket.on("message:new", handleMessageNew);
        socket.on("message:stream", handleMessageStream);
        socket.on("message:error", handleMessageError);
        socket.on("ai:state", handleAiState);
        socket.on("suggestion:new", handleSuggestionNew);
        socket.on("suggestion:status", handleSuggestionStatus);
        socket.on("artifact:updated", handleArtifactUpdated);
        socket.on("plan:created", handlePlanCreated);
        socket.on("plan:complete", handlePlanComplete);
        socket.on("plan:failed", handlePlanFailed);

        return () => {
            stopPolling();
            socket.off("connect", joinRoom);
            socket.off("message:new", handleMessageNew);
            socket.off("message:stream", handleMessageStream);
            socket.off("message:error", handleMessageError);
            socket.off("ai:state", handleAiState);
            socket.off("suggestion:new", handleSuggestionNew);
            socket.off("suggestion:status", handleSuggestionStatus);
            socket.off("artifact:updated", handleArtifactUpdated);
            socket.off("plan:created", handlePlanCreated);
            socket.off("plan:complete", handlePlanComplete);
            socket.off("plan:failed", handlePlanFailed);
            connectedIdeaRef.current = null;
        };
    }, [ideaId, loadSession, stopPolling]);

    // Send message
    const sendMessage = useCallback(async (content: string) => {
        if (!ideaId || !content.trim()) return;

        const trimmed = content.trim();

        // Optimistic append
        const optimisticMsg: IterationMessage = {
            id: OPTIMISTIC_PREFIX + Date.now(),
            sessionId: session?.id || "",
            role: "user",
            content: trimmed,
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setAiPhase("thinking");
        setIsSending(true);
        setError(null);
        socketStreamActiveRef.current = false;

        try {
            const savedMessage = await iterationApi.sendMessage(ideaId, trimmed);

            // Reconcile optimistic message
            setMessages(prev => {
                const withoutOpt = prev.filter(m => m.id !== optimisticMsg.id);
                if (withoutOpt.some(m => m.id === savedMessage.id)) return withoutOpt;
                return [...withoutOpt, savedMessage];
            });

            // Start polling fallback — polls every 3s until AI responds
            // Count current messages (including the just-sent user message)
            setMessages(prev => {
                const currentCount = prev.length;
                startPolling(ideaId, currentCount);
                return prev;
            });
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setAiPhase("error");
            setError(err instanceof Error ? err.message : "Failed to send message");
            throw err;
        } finally {
            setIsSending(false);
        }
    }, [ideaId, session?.id, startPolling]);

    // Confirm plan action
    const handleConfirmPlan = useCallback(async (planId: string) => {
        if (!ideaId) return;
        setAiPhase("applying");
        setError(null);
        try {
            const updatedPlan = await planApi.confirm(ideaId, planId);
            setActivePlan(updatedPlan);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm plan");
            setAiPhase("error");
        }
    }, [ideaId]);

    const dismissPlan = useCallback(() => {
        setActivePlan(null);
    }, []);

    return {
        session,
        messages,
        streamingText,
        isLoading,
        isSending,
        isThinking,
        aiPhase,
        activePlan,
        error,
        sendMessage,
        confirmPlan: handleConfirmPlan,
        dismissPlan,
        clearError,
    };
}
