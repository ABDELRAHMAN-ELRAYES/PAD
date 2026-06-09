import { useState, useEffect } from "react";
import { ideaApi } from "../api/ideas.api";
import { useConfirmIdea, useRefineIdea } from "../api/ideasQueries";
import { Idea, IQuestionAnswer } from "../types/models/idea";
import { useStreaming } from "@/components/providers/StreamingProvider";

export interface UseOverviewPanelReturn {
    isAnalyzing: boolean;
    isConfirming: boolean;
    isSubmittingAnswers: boolean;
    error: string | null;
    answers: Record<number, string>;
    hasSubmittedAnswers: boolean;
    expandedSections: Record<string, boolean>;
    streamingText: string;
    setError: (error: string | null) => void;
    toggleSection: (key: string) => void;
    handleAnalyze: () => Promise<void>;
    handleConfirm: () => Promise<void>;
    handleSubmitAnswers: () => Promise<void>;
    handleAnswerChange: (index: number, value: string) => void;
}

export function useOverviewPanel(
    idea: Idea,
    ideaId: string,
    onIdeaUpdate: (updated: Idea) => void
): UseOverviewPanelReturn {
    const { setPhaseStreaming } = useStreaming();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [hasSubmittedAnswers, setHasSubmittedAnswers] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        missingDetails: true,
        suggestions: false,
        risks: false,
        questions: true,
    });
    const [streamingText, setStreamingText] = useState("");

    const confirmMutation = useConfirmIdea();
    const refineMutation = useRefineIdea();

    useEffect(() => {
        if (isAnalyzing) {
            setPhaseStreaming("overview", true);
        } else {
            setPhaseStreaming("overview", false);
        }
    }, [isAnalyzing, setPhaseStreaming]);

    const toggleSection = (key: string) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setStreamingText("");
        setPhaseStreaming("overview", true);

        try {
            await ideaApi.analyzeStream(ideaId, (data) => {
                if (data.fullText) {
                    setStreamingText(data.fullText);
                }
                if (data.status === "final") {
                    setIsAnalyzing(false);
                    setStreamingText("");
                    onIdeaUpdate(data.idea);
                    setPhaseStreaming("overview", false);
                }
                if (data.status === "error") {
                    setError(data.message);
                    setIsAnalyzing(false);
                    setPhaseStreaming("overview", false);
                }
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze idea");
            setIsAnalyzing(false);
            setPhaseStreaming("overview", false);
        }
    };

    const handleConfirm = async () => {
        setError(null);
        confirmMutation.mutate(ideaId, {
            onSuccess: (updated) => {
                onIdeaUpdate(updated);
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to confirm idea");
            },
        });
    };

    const handleSubmitAnswers = async () => {
        if (!idea?.analysisResult?.clarifyingQuestions) return;

        const answersArray: IQuestionAnswer[] = idea.analysisResult.clarifyingQuestions
            .map((question: string, idx: number) => ({
                question,
                answer: answers[idx] || "",
            }))
            .filter((qa: IQuestionAnswer) => qa.answer.trim().length > 0);

        if (answersArray.length === 0) {
            setError("Please provide at least one answer");
            return;
        }

        setError(null);
        refineMutation.mutate({
            id: ideaId,
            input: { answers: answersArray }
        }, {
            onSuccess: (updated) => {
                onIdeaUpdate(updated);
                setAnswers({});
                setHasSubmittedAnswers(true);
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to submit answers");
            }
        });
    };

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [index]: value }));
    };

    return {
        isAnalyzing,
        isConfirming: confirmMutation.isPending,
        isSubmittingAnswers: refineMutation.isPending,
        error,
        answers,
        hasSubmittedAnswers,
        expandedSections,
        streamingText,
        setError,
        toggleSection,
        handleAnalyze,
        handleConfirm,
        handleSubmitAnswers,
        handleAnswerChange,
    };
}
