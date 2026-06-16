import { useState, useCallback, useEffect } from "react";
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

    const handleSetSection = useCallback((section: WorkspaceSection) => {
        setActiveSection(section);
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (section === "overview") {
                params.delete("tab");
            } else {
                params.set("tab", section);
            }
            const queryString = params.toString();
            const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
            window.history.pushState({}, "", newUrl);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get("tab") as WorkspaceSection | null;
            const validSections: WorkspaceSection[] = ["overview", "documents", "diagrams", "features", "workflow", "ir"];
            if (tab && validSections.includes(tab)) {
                setActiveSection(tab);
            } else {
                setActiveSection("overview");
            }

            // Sync activeIdeaId from the URL pathname
            const match = window.location.pathname.match(/\/ideas\/([^/?]+)/);
            if (match) {
                const ideaId = match[1];
                if (ideaId === "new") {
                    setActiveIdeaId(null);
                } else {
                    setActiveIdeaId(ideaId);
                }
            } else {
                setActiveIdeaId(null);
            }
        };

        window.addEventListener("popstate", handlePopState);
        // Sync initial state from URL on mount
        handlePopState();

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
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
        setActiveSection: handleSetSection,
        loadIdea,
        handleIdeaSelect,
        handleNewIdea,
        handleIdeaCreated,
        handleIdeaUpdate,
        handleArtifactUpdated,
        toggleSidebar,
    };
}
