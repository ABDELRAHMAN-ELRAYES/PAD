import { useState, useEffect, useCallback } from "react";
import { ideaApi } from "@/features/ideas/api/ideas.api";
import { Idea } from "@/features/ideas/types/models/idea";
import { workflowApi } from "../api/workflow.api";
import { Workflow, WorkflowStepStatus } from "../types/models/workflow";

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
    const [idea, setIdea] = useState<Idea | null>(null);
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [editInstructions, setEditInstructions] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ideaData = await ideaApi.getById(ideaId);
            setIdea(ideaData);

            if (ideaData.status !== "confirmed") {
                setError("This idea must be confirmed before creating a workflow.");
                setIsLoading(false);
                return;
            }

            try {
                const workflowData = await workflowApi.getByIdeaId(ideaId);
                setWorkflow(workflowData);
            } catch (err: any) {
                if (err.message && err.message.includes("404")) {
                    console.log("No workflow found yet.");
                } else {
                    throw err;
                }
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
        try {
            const data = await workflowApi.generate(ideaId);
            setWorkflow(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate workflow. Ensure features and tasks exist.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateStepStatus = async (stepId: string, newStatus: WorkflowStepStatus) => {
        setError(null);
        try {
            await workflowApi.updateStep(stepId, { status: newStatus });

            if (workflow && workflow.steps) {
                const updatedSteps = workflow.steps.map((step) =>
                    step.id === stepId ? { ...step, status: newStatus } : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update step status");
        }
    };

    const handleSaveInstructions = async (stepId: string) => {
        setIsSaving(true);
        setError(null);
        try {
            await workflowApi.updateStep(stepId, {
                instructions: editInstructions,
                changelog: "Manual edit to AI instructions",
            });

            if (workflow && workflow.steps) {
                const updatedSteps = workflow.steps.map((step) =>
                    step.id === stepId ? { ...step, instructions: editInstructions } : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
            setEditingStep(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save instructions");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!workflow) return;
        try {
            const markdown = await workflowApi.export(workflow.id);
            await navigator.clipboard.writeText(markdown);
            alert("Workflow instructions copied to clipboard! You can paste this directly into Cursor or GitHub Copilot.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export workflow");
        }
    };

    return {
        idea,
        workflow,
        isLoading,
        isGenerating,
        error,
        expandedStep,
        editingStep,
        editInstructions,
        isSaving,
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
