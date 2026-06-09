import { useState } from "react";
import { useIdea } from "@/features/ideas/api/ideasQueries";
import {
    useWorkflowByIdea,
    useGenerateWorkflow,
    useUpdateWorkflowStep,
    useExportWorkflow,
} from "../api/workflowQueries";
import { Workflow, WorkflowStepStatus } from "../types/models/workflow";
import { Idea } from "@/features/ideas/types/models/idea";

export interface UseWorkflowPageReturn {
    idea: Idea | null;
    workflow: Workflow | null;
    isLoading: boolean;
    isGenerating: boolean;
    error: string | null;
    expandedStep: string | null;
    editingStep: string | null;
    editInstructions: string;
    isSaving: boolean;
    setExpandedStep: (stepId: string | null) => void;
    setEditingStep: (stepId: string | null) => void;
    setEditInstructions: (instructions: string) => void;
    setError: (error: string | null) => void;
    fetchData: () => Promise<void>;
    handleGenerate: () => Promise<void>;
    handleUpdateStepStatus: (stepId: string, newStatus: WorkflowStepStatus) => Promise<void>;
    handleSaveInstructions: (stepId: string) => Promise<void>;
    handleExport: () => Promise<void>;
}

export function useWorkflowPage(ideaId: string): UseWorkflowPageReturn {
    const { data: idea, isLoading: isIdeaLoading } = useIdea(ideaId);
    const { data: workflow, isLoading: isWorkflowLoading, refetch: refetchWorkflow } = useWorkflowByIdea(ideaId);

    const [error, setError] = useState<string | null>(null);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [editInstructions, setEditInstructions] = useState("");

    const generateMutation = useGenerateWorkflow();
    const updateStepMutation = useUpdateWorkflowStep();
    const exportMutation = useExportWorkflow();

    const isLoading = isIdeaLoading || isWorkflowLoading;

    const fetchData = async () => {
        refetchWorkflow();
    };

    const handleGenerate = async () => {
        setError(null);
        generateMutation.mutate(ideaId, {
            onSuccess: () => {
                refetchWorkflow();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to generate workflow. Ensure features and tasks exist.");
            }
        });
    };

    const handleUpdateStepStatus = async (stepId: string, newStatus: WorkflowStepStatus) => {
        setError(null);
        updateStepMutation.mutate({
            stepId,
            data: { status: newStatus }
        }, {
            onSuccess: () => {
                refetchWorkflow();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to update step status");
            }
        });
    };

    const handleSaveInstructions = async (stepId: string) => {
        setError(null);
        updateStepMutation.mutate({
            stepId,
            data: {
                instructions: editInstructions,
                changelog: "Manual edit to AI instructions",
            }
        }, {
            onSuccess: () => {
                refetchWorkflow();
                setEditingStep(null);
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to save instructions");
            }
        });
    };

    const handleExport = async () => {
        if (!workflow) return;
        setError(null);
        exportMutation.mutate(workflow.id, {
            onSuccess: async (markdown) => {
                await navigator.clipboard.writeText(markdown);
                alert("Workflow instructions copied to clipboard! You can paste this directly into Cursor or GitHub Copilot.");
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to export workflow");
            }
        });
    };

    // Add extra business logic check
    let activeError = error;
    if (idea && idea.status !== "confirmed") {
        activeError = "This idea must be confirmed before creating a workflow.";
    }

    return {
        idea: idea || null,
        workflow: workflow || null,
        isLoading,
        isGenerating: generateMutation.isPending,
        error: activeError,
        expandedStep,
        editingStep,
        editInstructions,
        isSaving: updateStepMutation.isPending,
        setExpandedStep,
        setEditingStep,
        setEditInstructions,
        setError,
        fetchData,
        handleGenerate,
        handleUpdateStepStatus,
        handleSaveInstructions,
        handleExport,
    };
}
