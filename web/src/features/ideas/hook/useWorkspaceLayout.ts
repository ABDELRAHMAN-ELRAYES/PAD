import { useState, useCallback } from "react";
import { useIdea } from "../api/ideasQueries";
import { Idea } from "../types/models/idea";
import { WorkspaceSection } from "@/types/workspace";

export interface UseWorkspaceLayoutReturn {
    activeIdeaId: string | null;
    idea: Idea | null;
    isLoading: boolean;
    activeSection: WorkspaceSection;
    isSidebarCollapsed: boolean;
    refreshKey: number;
    setActiveSection: (section: WorkspaceSection) => void;
    loadIdea: (ideaId: string) => Promise<void>;
    handleIdeaSelect: (ideaId: string) => void;
    handleNewIdea: () => void;
    handleIdeaCreated: (newIdeaId: string) => void;
    handleIdeaUpdate: (updated: Idea) => void;
    handleArtifactUpdated: () => void;
    toggleSidebar: () => void;
}

export function useWorkspaceLayout(initialIdeaId: string | null = null): UseWorkspaceLayoutReturn {
    const [activeIdeaId, setActiveIdeaId] = useState<string | null>(initialIdeaId);
    const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { data: ideaData, isLoading, refetch } = useIdea(activeIdeaId ?? undefined);

    const loadIdea = useCallback(async (ideaId: string) => {
        setActiveIdeaId(ideaId);
    }, []);

    const handleIdeaSelect = (ideaId: string) => {
        setActiveIdeaId(ideaId);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/${ideaId}`);
    };

    const handleNewIdea = () => {
        setActiveIdeaId(null);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/new`);
    };

    const handleIdeaCreated = (newIdeaId: string) => {
        setActiveIdeaId(newIdeaId);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/${newIdeaId}`);
    };

    const handleIdeaUpdate = (_updated: Idea) => {
        refetch();
    };

    const handleArtifactUpdated = useCallback(() => {
        console.log("[WorkspaceLayout] Refreshing panels due to artifact update...");
        setRefreshKey((prev) => prev + 1);
        refetch();
    }, [refetch]);

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => !prev);
    };

    return {
        activeIdeaId,
        idea: ideaData || null,
        isLoading,
        activeSection,
        isSidebarCollapsed,
        refreshKey,
        setActiveSection,
        loadIdea,
        handleIdeaSelect,
        handleNewIdea,
        handleIdeaCreated,
        handleIdeaUpdate,
        handleArtifactUpdated,
        toggleSidebar,
    };
}
