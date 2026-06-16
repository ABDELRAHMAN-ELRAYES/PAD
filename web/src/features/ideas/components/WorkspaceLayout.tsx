"use client";

import { FC, useEffect, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AppSidebar } from "./AppSidebar";
import { OverviewPanel } from "./OverviewPanel";
import { DocumentsPanel } from "@/features/documents";
import { DiagramsPanel } from "@/features/diagrams";
import { FeaturesPanel } from "@/features/features";
import IREditor from "@/features/ir/components/IREditor";
import { Loader2 } from "lucide-react";
import { StreamingProvider } from "@/components/providers/StreamingProvider";
import { WorkspaceLayoutProps } from "../types/components/WorkspaceLayout.types";
import { UnifiedChat } from "@/features/chat";
import { useWorkspaceLayout } from "../hook/useWorkspaceLayout";
import { useMe } from "@/features/auth/api/authQueries";
import { WorkflowPanel } from "@/features/workflow";

export const WorkspaceLayout: FC<WorkspaceLayoutProps> = ({
  initialIdeaId = null,
}) => {
  const [mounted, setMounted] = useState(false);
  const {
    activeIdeaId,
    idea,
    isLoading,
    activeSection,
    isSidebarCollapsed,
    refreshKey,
    setActiveSection,
    handleIdeaSelect,
    handleNewIdea,
    handleIdeaCreated,
    handleIdeaUpdate,
    handleArtifactUpdated,
    toggleSidebar,
  } = useWorkspaceLayout(initialIdeaId);
  const { data: me, isLoading: isMeLoading } = useMe();
  const isAuthenticated = !!me?.data?.user;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isMeLoading && !isAuthenticated && activeIdeaId) {
      handleNewIdea();
    }
  }, [mounted, isMeLoading, isAuthenticated, activeIdeaId, handleNewIdea]);

  if (!mounted || isMeLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            onSectionChange={setActiveSection}
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
      case "ir":
        return <IREditor key={refreshKey} ideaId={activeIdeaId} idea={idea} />;
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
