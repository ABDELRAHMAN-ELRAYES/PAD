import { useState, useEffect, useCallback } from "react";
import { ideaApi } from "../api/ideas.api";
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
    const [idea, setIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadIdea = useCallback(async (ideaId: string) => {
        setIsLoading(true);
        try {
            const data = await ideaApi.getById(ideaId);
            setIdea(data);
        } catch {
            setIdea(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeIdeaId) {
            loadIdea(activeIdeaId);
        } else {
            setIdea(null);
        }
    }, [activeIdeaId, loadIdea]);

    const handleIdeaSelect = (ideaId: string) => {
        setActiveIdeaId(ideaId);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/${ideaId}`);
    };

    const handleNewIdea = () => {
        setActiveIdeaId(null);
        setIdea(null);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/new`);
    };

    const handleIdeaCreated = (newIdeaId: string) => {
        setActiveIdeaId(newIdeaId);
        setActiveSection("overview");
        window.history.pushState({}, "", `/ideas/${newIdeaId}`);
    };

    const handleIdeaUpdate = (updated: Idea) => {
        setIdea(updated);
    };

    const handleArtifactUpdated = useCallback(() => {
        console.log("[WorkspaceLayout] Refreshing panels due to artifact update...");
        setRefreshKey((prev) => prev + 1);
        if (activeIdeaId) {
            loadIdea(activeIdeaId);
        }
    }, [activeIdeaId, loadIdea]);

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => !prev);
    };

    return {
        activeIdeaId,
        idea,
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
