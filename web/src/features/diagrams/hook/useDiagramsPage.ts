import { useState, useEffect } from "react";
import { useIdea } from "@/features/ideas/api/ideasQueries";
import { diagramApi } from "../api/diagrams.api";
import { useDiagramsByIdea, useUpdateDiagram, useRegenerateDiagram } from "../api/diagramsQueries";
import { Diagram } from "../types/models/diagrams";
import { Idea } from "@/features/ideas";

export interface UseDiagramsPageReturn {
    idea: Idea | null;
    diagrams: Diagram[];
    isLoading: boolean;
    isGenerating: boolean;
    isSaving: Record<string, boolean>;
    error: string | null;
    editedCode: Record<string, string>;
    activeTab: string;
    streamingCode: Record<string, string>;
    setActiveTab: (tab: string) => void;
    setError: (error: string | null) => void;
    handleGenerate: () => Promise<void>;
    handleSave: (diagram: Diagram) => Promise<void>;
    handleRegenerate: (diagram: Diagram) => Promise<void>;
    handleCodeChange: (diagramId: string, code: string) => void;
}

export function useDiagramsPage(ideaId: string): UseDiagramsPageReturn {
    const { data: idea, isLoading: isIdeaLoading } = useIdea(ideaId);
    const { data: diagramsData, isLoading: isDiagramsLoading, refetch: refetchDiagrams } = useDiagramsByIdea(ideaId);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [editedCode, setEditedCode] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<string>("ERD");
    const [streamingCode, setStreamingCode] = useState<Record<string, string>>({});

    const updateMutation = useUpdateDiagram();
    const regenerateMutation = useRegenerateDiagram();

    const diagrams = diagramsData || [];
    const isLoading = isIdeaLoading || isDiagramsLoading;

    // Initialize edited code for each diagram
    useEffect(() => {
        if (diagramsData) {
            const codeMap: Record<string, string> = {};
            diagramsData.forEach((d) => {
                codeMap[d.id] = d.mermaidCode;
            });
            setEditedCode((prev) => ({ ...codeMap, ...prev }));

            // Set active tab to first available diagram type
            if (diagramsData.length > 0 && !activeTab) {
                setActiveTab(diagramsData[0].type);
            }
        }
    }, [diagramsData]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setStreamingCode({});
        try {
            await diagramApi.generateStream(ideaId, (data) => {
                if (data.chunk && data.type) {
                    setStreamingCode((prev) => ({
                        ...prev,
                        [data.type]: data.fullText || (prev[data.type] || "") + data.chunk,
                    }));
                    setActiveTab(data.type);
                }

                if (data.status === "final") {
                    setIsGenerating(false);
                    setStreamingCode({});
                    refetchDiagrams();
                }

                if (data.status === "error") {
                    setIsGenerating(false);
                    setError(data.message || "Failed to generate diagrams");
                    setStreamingCode({});
                }
            });
        } catch (err) {
            setIsGenerating(false);
            setError(err instanceof Error ? err.message : "Failed to generate diagrams");
            setStreamingCode({});
        }
    };

    const handleSave = async (diagram: Diagram) => {
        const newCode = editedCode[diagram.id];
        if (newCode === diagram.mermaidCode) return; // No changes

        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        setError(null);

        updateMutation.mutate({
            id: diagram.id,
            data: {
                mermaidCode: newCode,
                changelog: "Manual edit",
            }
        }, {
            onSuccess: () => {
                refetchDiagrams();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to save diagram");
            },
            onSettled: () => {
                setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
            }
        });
    };

    const handleRegenerate = async (diagram: Diagram) => {
        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        setError(null);

        regenerateMutation.mutate(diagram.id, {
            onSuccess: (updated) => {
                refetchDiagrams();
                setEditedCode((prev) => ({ ...prev, [diagram.id]: updated.mermaidCode }));
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to regenerate diagram");
            },
            onSettled: () => {
                setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
            }
        });
    };

    const handleCodeChange = (diagramId: string, code: string) => {
        setEditedCode((prev) => ({ ...prev, [diagramId]: code }));
    };

    return {
        idea: idea || null,
        diagrams,
        isLoading,
        isGenerating,
        isSaving,
        error,
        editedCode,
        activeTab,
        streamingCode,
        setActiveTab,
        setError,
        handleGenerate,
        handleSave,
        handleRegenerate,
        handleCodeChange,
    };
}
