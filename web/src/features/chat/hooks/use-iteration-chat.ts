"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useIterationSession, useSendIterationMessage } from "@/features/chat/api/chatQueries";
import { IterationSession, IterationMessage } from "../types/models/chat";
import { socket } from "@/lib/socket";
import { AiPhase } from "../types/components/AiStatusIndicator.types";

interface UseIterationChatReturn {
    session: IterationSession | null;
    messages: IterationMessage[];
    streamingText: string | null;
    isLoading: boolean;
    isSending: boolean;
    isThinking: boolean; // Backcompat
    aiPhase: AiPhase;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    clearError: () => void;
}

const OPTIMISTIC_PREFIX = "__opt_";
// Poll interval for REST fallback when socket streaming doesn't arrive
const POLL_INTERVAL_MS = 3000;
// Max number of polls before giving up
const MAX_POLLS = 40;

export function useIterationChat(ideaId: string | null, onArtifactUpdated?: () => void): UseIterationChatReturn {
    const { data: sessionData, isLoading, refetch: refetchSession } = useIterationSession(ideaId ?? undefined);

    const [messages, setMessages] = useState<IterationMessage[]>([]);
    const [streamingText, setStreamingText] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
    const isThinking = aiPhase !== "idle" && aiPhase !== "error" && !streamingText;
    const [error, setError] = useState<string | null>(null);

    const sendMessageMutation = useSendIterationMessage();

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

    // Sync sessionData with local messages state when it is loaded/refetched
    useEffect(() => {
        if (sessionData) {
            setMessages(sessionData.messages || []);
        }
    }, [sessionData]);

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
                const result = await refetchSession();
                const data = result.data;
                if (data) {
                    const msgs = data.messages || [];
                    const assistantMsgs = msgs.filter((m: IterationMessage) => m.role === "assistant");
                    const userMsgs = msgs.filter((m: IterationMessage) => m.role === "user");

                    if (assistantMsgs.length >= userMsgs.length && msgs.length > userMsgCount) {
                        setMessages(msgs);
                        setStreamingText(null);
                        setAiPhase("idle");
                        stopPolling();
                    }
                }
            } catch {
                // Silently continue polling
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling, refetchSession]);

    // Socket lifecycle
    useEffect(() => {
        if (!ideaId) {
            setMessages([]);
            setStreamingText(null);
            setAiPhase("idle");
            stopPolling();
            return;
        }

        connectedIdeaRef.current = ideaId;

        const joinRoom = () => {
            if (connectedIdeaRef.current) {
                console.log(`[Chat] Socket join room: ${connectedIdeaRef.current}`);
                socket.emit("join-room", connectedIdeaRef.current);
            }
        };

        socket.on("connect", joinRoom);

        if (socket.connected) {
            joinRoom();
        } else {
            socket.connect();
        }

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
        const handleArtifactUpdated = () => {
            onArtifactUpdatedRef.current?.();
        };

        socket.on("message:new", handleMessageNew);
        socket.on("message:stream", handleMessageStream);
        socket.on("message:error", handleMessageError);
        socket.on("ai:state", handleAiState);
        socket.on("artifact:updated", handleArtifactUpdated);

        return () => {
            stopPolling();
            socket.off("connect", joinRoom);
            socket.off("message:new", handleMessageNew);
            socket.off("message:stream", handleMessageStream);
            socket.off("message:error", handleMessageError);
            socket.off("ai:state", handleAiState);
            socket.off("artifact:updated", handleArtifactUpdated);
            connectedIdeaRef.current = null;
        };
    }, [ideaId, stopPolling]);

    // Send message
    const sendMessage = useCallback(async (content: string) => {
        if (!ideaId || !content.trim()) return;

        const trimmed = content.trim();

        // Optimistic append
        const optimisticMsg: IterationMessage = {
            id: OPTIMISTIC_PREFIX + Date.now(),
            sessionId: sessionData?.id || "",
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
            const savedMessage = await sendMessageMutation.mutateAsync({ ideaId, content: trimmed });

            setMessages(prev => {
                const withoutOpt = prev.filter(m => m.id !== optimisticMsg.id);
                if (withoutOpt.some(m => m.id === savedMessage.id)) return withoutOpt;
                return [...withoutOpt, savedMessage];
            });

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
    }, [ideaId, sessionData?.id, startPolling, sendMessageMutation]);

    return {
        session: sessionData || null,
        messages,
        streamingText,
        isLoading,
        isSending,
        isThinking,
        aiPhase,
        error,
        sendMessage,
        clearError,
    };
}
