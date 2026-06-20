import { useState, useEffect, useCallback } from "react";
import { useIdea } from "@/features/ideas/api/ideasQueries";
import { diagramApi } from "../api/diagrams.api";
import { useDiagramsByIdea, useUpdateDiagram, useImportDiagram, useRepairDiagram } from "../api/diagramsQueries";
import { Diagram, DiagramType } from "../types/models/diagrams";
import { Idea } from "@/features/ideas";
import { ActivityLog } from "../components/ActivityFeed";
import { toast } from "sonner";

export interface UseDiagramsPageReturn {
    idea: Idea | null;
    diagrams: Diagram[];
    isLoading: boolean;
    isGeneratingMap: Record<string, boolean>;
    isSaving: Record<string, boolean>;
    logs: ActivityLog[];
    editedCode: Record<string, string>;
    editedTitles: Record<string, string>;
    activeTab: DiagramType;
    streamingCode: Record<string, string>;
    setActiveTab: (tab: DiagramType) => void;
    handleInitialize: () => Promise<void>;
    handleSave: (diagram: Diagram) => Promise<void>;
    handleGenerateSingle: (diagram: Diagram) => Promise<void>;
    handleRegenerateSingle: (diagram: Diagram) => Promise<void>;
    handleRepairSingle: (diagram: Diagram, errorMessage: string) => Promise<void>;
    handleImport: (diagram: Diagram, code: string, title?: string) => Promise<void>;
    handleTierSelect: (diagram: Diagram, tier: number) => Promise<void>;
    handleCodeChange: (diagramId: string, code: string) => void;
    handleTitleChange: (diagramId: string, title: string) => void;
    clearLogs: () => void;
}

export function useDiagramsPage(ideaId: string): UseDiagramsPageReturn {
    const { data: idea, isLoading: isIdeaLoading } = useIdea(ideaId);
    const { data: diagramsData, isLoading: isDiagramsLoading, refetch: refetchDiagrams } = useDiagramsByIdea(ideaId) as { data: Diagram[] | undefined; isLoading: boolean; refetch: () => any };

    const [isInitializing, setIsInitializing] = useState(false);
    const [isGeneratingMap, setIsGeneratingMap] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const [editedCode, setEditedCode] = useState<Record<string, string>>({});
    const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<DiagramType>("SYSTEM_ARCHITECTURE");
    const [streamingCode, setStreamingCode] = useState<Record<string, string>>({});
    const [logs, setLogs] = useState<ActivityLog[]>([]);

    const updateMutation = useUpdateDiagram();
    const importMutation = useImportDiagram();
    const repairMutation = useRepairDiagram();

    // Prevent screen-blocking loaders on background query refetches
    const isLoading =
        (isIdeaLoading && !idea) ||
        (isDiagramsLoading && (!diagramsData || diagramsData.length === 0)) ||
        isInitializing;

    // Helper to log activities
    const addLog = useCallback((type: ActivityLog["type"], message: string) => {
        setLogs((prev) => [
            ...prev,
            {
                id: Math.random().toString(36).substring(2, 9),
                timestamp: new Date(),
                type,
                message,
            },
        ]);
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    // Initialize edited code & title maps when diagrams load
    useEffect(() => {
        if (diagramsData && diagramsData.length > 0) {
            const codeMap: Record<string, string> = {};
            const titleMap: Record<string, string> = {};
            diagramsData.forEach((d) => {
                codeMap[d.id] = d.mermaidCode || "";
                titleMap[d.id] = d.title || "";
            });
            setEditedCode((prev) => ({ ...codeMap, ...prev }));
            setEditedTitles((prev) => ({ ...titleMap, ...prev }));

            // Default active tab to System Architecture if present, or first diagram type
            if (!activeTab || !diagramsData.some(d => d.type === activeTab)) {
                const sysArch = diagramsData.find(d => d.type === "SYSTEM_ARCHITECTURE");
                if (sysArch) {
                    setActiveTab("SYSTEM_ARCHITECTURE");
                } else {
                    setActiveTab(diagramsData[0].type);
                }
            }
        }
    }, [diagramsData]);

    // Map diagrams to overlay the edited local titles and codes
    const diagrams = (diagramsData || []).map((d) => ({
        ...d,
        title: editedTitles[d.id] !== undefined ? editedTitles[d.id] : d.title,
        mermaidCode: editedCode[d.id] !== undefined ? editedCode[d.id] : d.mermaidCode,
    }));

    // Initialize/Create diagram placeholders
    const handleInitialize = async () => {
        setIsInitializing(true);
        addLog("info", "Initializing diagram workspace placeholders...");
        try {
            await diagramApi.generate(ideaId);
            await refetchDiagrams();
            addLog("success", "Diagram workspace initialized successfully. All 10 catalog diagrams ready.");
            toast.success("Diagram catalog initialized.");
        } catch (err: any) {
            addLog("error", `Initialization failed: ${err.message || err}`);
            toast.error(err.message || "Failed to initialize diagrams");
        } finally {
            setIsInitializing(false);
        }
    };

    // Save diagram manual edits & title updates
    const handleSave = async (diagram: Diagram) => {
        const newCode = editedCode[diagram.id];
        const newTitle = editedTitles[diagram.id];
        if (newCode === diagram.mermaidCode && newTitle === diagram.title) return; // No changes

        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        addLog("info", `Saving changes and running compiler checks for ${newTitle}...`);

        updateMutation.mutate({
            id: diagram.id,
            data: {
                title: newTitle,
                mermaidCode: newCode,
                activeTier: null, // Custom edit voids the compiled tier selections
                changelog: "Manual edit",
            }
        }, {
            onSuccess: (data) => {
                refetchDiagrams();
                if (data.status === "repair_failed") {
                    addLog("warning", `Saved successfully, but compiler syntax errors detected: ${data.validationError || "Invalid syntax"}`);
                    toast.warning("Saved with diagram syntax warning.");
                } else {
                    addLog("success", `Changes for ${newTitle} saved and verified successfully.`);
                    toast.success("Diagram saved and verified.");
                }
            },
            onError: (err: any) => {
                addLog("error", `Failed to save ${newTitle}: ${err?.message || err}`);
                toast.error("Failed to save diagram.");
            },
            onSettled: () => {
                setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
            }
        });
    };

    // Stream generation for a single diagram (SSE)
    const handleGenerateSingle = async (diagram: Diagram) => {
        const id = diagram.id;
        setIsGeneratingMap((prev) => ({ ...prev, [id]: true }));
        setStreamingCode((prev) => ({ ...prev, [id]: "" }));
        addLog("info", `Connecting to streaming channel for ${diagram.title}...`);

        diagramApi.generateStream(
            id,
            (chunk) => {
                setStreamingCode((prev) => ({
                    ...prev,
                    [id]: (prev[id] || "") + chunk,
                }));
            },
            (data) => {
                setIsGeneratingMap((prev) => ({ ...prev, [id]: false }));
                setStreamingCode((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                setEditedCode((prev) => ({ ...prev, [id]: data.code }));
                setEditedTitles((prev) => ({ ...prev, [id]: data.title }));
                
                if (data.status === "repair_failed") {
                    addLog("error", `AI compilation failed. Saved with syntax errors: "${data.validationError || "Unrecognized syntax"}"`);
                    toast.error(`Diagram generated with syntax errors.`);
                } else {
                    addLog("success", `AI stream completed and verified for ${data.title}.`);
                    toast.success(`${data.title} generated successfully.`);
                }
                refetchDiagrams();
            },
            (err) => {
                setIsGeneratingMap((prev) => ({ ...prev, [id]: false }));
                setStreamingCode((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                addLog("error", `Streaming error for ${diagram.title}: ${err.message || err}`);
                toast.error("Streaming connection error.");
            }
        );
    };

    // Stream regeneration for a single diagram (SSE)
    const handleRegenerateSingle = async (diagram: Diagram) => {
        const id = diagram.id;
        setIsGeneratingMap((prev) => ({ ...prev, [id]: true }));
        setStreamingCode((prev) => ({ ...prev, [id]: "" }));
        addLog("info", `Cloning current snapshot. Initiating regeneration stream for ${diagram.title}...`);

        diagramApi.regenerateStream(
            id,
            (chunk) => {
                setStreamingCode((prev) => ({
                    ...prev,
                    [id]: (prev[id] || "") + chunk,
                }));
            },
            (data) => {
                setIsGeneratingMap((prev) => ({ ...prev, [id]: false }));
                setStreamingCode((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                setEditedCode((prev) => ({ ...prev, [id]: data.code }));
                setEditedTitles((prev) => ({ ...prev, [id]: data.title }));

                if (data.status === "repair_failed") {
                    addLog("error", `Regeneration complete, but syntax errors persist: "${data.validationError || "Unrecognized syntax"}"`);
                    toast.error(`Diagram regenerated with syntax errors.`);
                } else {
                    addLog("success", `AI regeneration completed and verified for ${data.title}.`);
                    toast.success(`${data.title} regenerated.`);
                }
                refetchDiagrams();
            },
            (err) => {
                setIsGeneratingMap((prev) => ({ ...prev, [id]: false }));
                setStreamingCode((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                addLog("error", `Regeneration streaming failed for ${diagram.title}: ${err.message || err}`);
                toast.error("Regeneration failed.");
            }
        );
    };

    // Auto-repair specific diagram code using error message feedback
    const handleRepairSingle = async (diagram: Diagram, errorMessage: string) => {
        const id = diagram.id;
        const codeToRepair = editedCode[id] !== undefined ? editedCode[id] : diagram.mermaidCode;
        setIsSaving((prev) => ({ ...prev, [id]: true }));
        addLog("info", `Sending code to LLM for target repair based on syntax error...`);

        repairMutation.mutate({
            id,
            code: codeToRepair,
            errorMessage,
        }, {
            onSuccess: (data) => {
                setEditedCode((prev) => ({ ...prev, [id]: data.mermaidCode }));
                setEditedTitles((prev) => ({ ...prev, [id]: data.title }));
                addLog("success", `AI successfully corrected syntax error for ${diagram.title}.`);
                toast.success("Syntax corrected by AI.");
                refetchDiagrams();
            },
            onError: (err: any) => {
                addLog("error", `AI Repair failed: ${err.message || err}`);
                toast.error(err.message || "Failed to repair diagram");
            },
            onSettled: () => {
                setIsSaving((prev) => ({ ...prev, [id]: false }));
            }
        });
    };

    // Import diagram code
    const handleImport = async (diagram: Diagram, code: string, title?: string) => {
        addLog("info", `Importing custom Mermaid syntax for ${diagram.title}...`);
        try {
            await importMutation.mutateAsync({ id: diagram.id, code, title });
            setEditedCode((prev) => ({ ...prev, [diagram.id]: code }));
            if (title) setEditedTitles((prev) => ({ ...prev, [diagram.id]: title }));
            addLog("success", `Successfully imported custom code for ${diagram.title}. Running compiler checks...`);
            refetchDiagrams();
        } catch (err: any) {
            addLog("error", `Import failed: ${err.message || err}`);
            throw err;
        }
    };

    // Select compiled multi-tier diagram (Tier 1 / 2 / 3)
    const handleTierSelect = async (diagram: Diagram, tier: number) => {
        let code = diagram.tier2Code || diagram.mermaidCode;
        if (tier === 1) code = diagram.tier1Code || code;
        if (tier === 3) code = diagram.tier3Code || code;

        addLog("info", `Switching active compilation level to Tier ${tier} (IR details changed).`);
        try {
            await updateMutation.mutateAsync({
                id: diagram.id,
                data: {
                    activeTier: tier,
                    mermaidCode: code,
                },
            });
            setEditedCode((prev) => ({ ...prev, [diagram.id]: code }));
            addLog("success", `Active tier set to Tier ${tier}.`);
            refetchDiagrams();
        } catch (err: any) {
            addLog("error", `Failed to set compile tier: ${err.message || err}`);
        }
    };

    // Handle inline code editing updates
    const handleCodeChange = (diagramId: string, code: string) => {
        setEditedCode((prev) => ({ ...prev, [diagramId]: code }));
    };

    // Handle title input change
    const handleTitleChange = (diagramId: string, title: string) => {
        setEditedTitles((prev) => ({ ...prev, [diagramId]: title }));
    };

    return {
        idea: idea || null,
        diagrams,
        isLoading,
        isGeneratingMap,
        isSaving,
        logs,
        editedCode,
        editedTitles,
        activeTab,
        streamingCode,
        setActiveTab,
        handleInitialize,
        handleSave,
        handleGenerateSingle,
        handleRegenerateSingle,
        handleRepairSingle,
        handleImport,
        handleTierSelect,
        handleCodeChange,
        handleTitleChange,
        clearLogs,
    };
}
