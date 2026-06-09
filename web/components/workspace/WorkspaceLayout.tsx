"use client";

import { FC, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AppSidebar } from "./AppSidebar";
import { UnifiedChat } from "./UnifiedChat";
import { OverviewPanel } from "./panels/OverviewPanel";
import { DocumentsPanel } from "./panels/DocumentsPanel";
import { DiagramsPanel } from "./panels/DiagramsPanel";
import { FeaturesPanel } from "./panels/FeaturesPanel";
import { WorkflowPanel } from "./panels/WorkflowPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { Idea } from "@/lib/types/idea";
import { ideaApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { StreamingProvider } from "@/components/streaming-provider";
import { WorkspaceSection } from "@/lib/types/workspace";
import { WorkspaceLayoutProps } from "./WorkspaceLayout.types";

export const WorkspaceLayout: FC<WorkspaceLayoutProps> = ({
  initialIdeaId = null,
}) => {
  const router = useRouter();
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(
    initialIdeaId,
  );
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fetch idea data when activeIdeaId changes
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
    // Update URL without full refresh
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

  const [refreshKey, setRefreshKey] = useState(0);

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

  const renderContentPanel = () => {
    if (!activeIdeaId || !idea) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    switch (activeSection) {
      case "overview":
        return (
          <OverviewPanel
            key={refreshKey}
            idea={idea}
            ideaId={activeIdeaId}
            onIdeaUpdate={handleIdeaUpdate}
          />
        );
      case "documents":
        return <DocumentsPanel key={refreshKey} ideaId={activeIdeaId} idea={idea} />;
      case "diagrams":
        return <DiagramsPanel key={refreshKey} ideaId={activeIdeaId} />;
      case "features":
        return <FeaturesPanel key={refreshKey} ideaId={activeIdeaId} />;
      case "workflow":
        return <WorkflowPanel key={refreshKey} ideaId={activeIdeaId} idea={idea} />;
      case "history":
        return <HistoryPanel key={refreshKey} ideaId={activeIdeaId} onArtifactUpdated={handleArtifactUpdated} />;
      default:
        return null;
    }
  };

  return (
    <StreamingProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Global Sidebar: Ideas list + section nav */}
        <AppSidebar
          activeIdeaId={activeIdeaId}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onIdeaSelect={handleIdeaSelect}
          onNewIdea={handleNewIdea}
          ideaStatus={idea?.status}
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />

        {/* Main workspace: Chat + Content */}
        {!activeIdeaId ? (
          // Full screen chat for new ideas
          <div className="flex-1 flex flex-col h-full bg-background">
            <div className="flex-1 overflow-hidden">
              <UnifiedChat ideaId={null} onIdeaCreated={handleIdeaCreated} />
            </div>
          </div>
        ) : (
          // Split screen workspace for existing ideas
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Chat Panel */}
            <ResizablePanel
              defaultSize={38}
              minSize={25}
              maxSize={55}
              className="flex flex-col"
            >
              <div className="flex-1 overflow-hidden">
                <UnifiedChat
                  ideaId={activeIdeaId}
                  onIdeaCreated={handleIdeaCreated}
                  onArtifactUpdated={handleArtifactUpdated}
                />
              </div>
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle />

            {/* Content Panel */}
            <ResizablePanel
              defaultSize={62}
              minSize={35}
              className="flex flex-col"
            >
              <div className="flex-1 overflow-y-auto workspace-panel">
                {renderContentPanel()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </StreamingProvider>
  );
};
