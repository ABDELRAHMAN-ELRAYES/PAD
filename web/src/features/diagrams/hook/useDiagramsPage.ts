import { useState, useEffect, useCallback } from "react";
import { ideaApi } from "@/features/ideas";
import { diagramApi } from "../api/diagrams.api";
import { Diagram, DiagramType } from "../types/models/diagrams";
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
    const [idea, setIdea] = useState<Idea | null>(null);
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [editedCode, setEditedCode] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<string>("ERD");
    const [streamingCode, setStreamingCode] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        try {
            const [ideaData, diagramsData] = await Promise.all([
                ideaApi.getById(ideaId),
                diagramApi.getByIdeaId(ideaId),
            ]);
            setIdea(ideaData as any);
            setDiagrams(diagramsData);

            // Initialize edited code for each diagram
            const codeMap: Record<string, string> = {};
            diagramsData.forEach((d) => {
                codeMap[d.id] = d.mermaidCode;
            });
            setEditedCode(codeMap);

            // Set active tab to first available diagram type
            if (diagramsData.length > 0) {
                setActiveTab(diagramsData[0].type);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        if (ideaId) {
            fetchData();
        }
    }, [ideaId, fetchData]);

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
                    if (data.diagrams) {
                        setDiagrams(data.diagrams);
                        const codeMap: Record<string, string> = {};
                        data.diagrams.forEach((d: any) => {
                            codeMap[d.id] = d.mermaidCode;
                        });
                        setEditedCode(codeMap);
                        if (data.diagrams.length > 0) {
                            setActiveTab(data.diagrams[0].type);
                        }
                    }
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
        try {
            const updated = await diagramApi.update(diagram.id, {
                mermaidCode: newCode,
                changelog: "Manual edit",
            });
            setDiagrams((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save diagram");
        } finally {
            setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
        }
    };

    const handleRegenerate = async (diagram: Diagram) => {
        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        setError(null);
        try {
            const updated = await diagramApi.regenerate(diagram.id);
            setDiagrams((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
            );
            setEditedCode((prev) => ({ ...prev, [diagram.id]: updated.mermaidCode }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to regenerate diagram");
        } finally {
            setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
        }
    };

    const handleCodeChange = (diagramId: string, code: string) => {
        setEditedCode((prev) => ({ ...prev, [diagramId]: code }));
    };

    return {
        idea,
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
