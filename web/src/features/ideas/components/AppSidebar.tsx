"use client";

import { FC, useEffect, useState } from "react";
import { ideaApi } from "@/features/ideas/api/ideas.api";
import { Idea } from "../types/models/idea";
import {
  Plus,
  Lightbulb,
  CheckCircle,
  Clock,
  Loader2,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStreaming } from "@/components/providers/StreamingProvider";
import { SECTION_ITEMS, SidebarItem } from "@/config/workspace";
import { AppSidebarProps } from "../types/components/AppSidebar.types";

export const AppSidebar: FC<AppSidebarProps> = ({
  activeIdeaId,
  activeSection,
  onSectionChange,
  onIdeaSelect,
  onNewIdea,
  ideaStatus,
  isCollapsed,
  onToggle,
}) => {
  const { streamingStatus } = useStreaming();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadIdeas() {
      try {
        const data = await ideaApi.list();
        setIdeas(data);
      } catch {
        // Silently fail — sidebar is non-critical
      } finally {
        setIsLoading(false);
      }
    }
    loadIdeas();
  }, [activeIdeaId]);

  return (
    <div
      className={cn(
        "flex flex-col h-full shrink-0 border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out overflow-hidden relative",
        isCollapsed ? "w-[60px]" : "w-[260px]",
      )}
    >
      {/* Logo / Header */}
      <div
        className={cn(
          "flex items-center h-[60px] border-b border-border shrink-0 px-3",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <h1 className="text-4xl text-black font-extrabold tracking-tight truncate pl-1">
            PAD
          </h1>
        )}
        <button
          onClick={onToggle}
          className="cursor-pointer p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* New Idea Button */}
      <div className="p-3 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewIdea}
              className={cn(
                "cursor-pointer flex items-center rounded-lg transition-colors border border-dashed border-border hover:bg-accent hover:border-accent-foreground/20 shrink-0",
                !activeIdeaId &&
                  "bg-accent border-solid border-accent-foreground/20",
                isCollapsed
                  ? "w-9 h-9 justify-center mx-auto"
                  : "w-full gap-2 px-3 py-2 text-sm font-medium",
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">New Idea</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">New Idea</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar">
        {/* SECTION: Workspace Icons (Visible only when Collapsed & Idea Selected) */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isCollapsed && activeIdeaId
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden flex flex-col space-y-2">
            <div className="w-8 h-px bg-border my-2 mx-auto shrink-0" />
            {activeIdeaId &&
              SECTION_ITEMS.map((item: SidebarItem) => {
                const isActive = activeSection === item.id;
                const isStreaming = streamingStatus[item.id];
                const isDisabled =
                  ideaStatus !== "confirmed" && item.id !== "overview";

                return (
                  <Tooltip key={"collapsed-" + item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isDisabled && onSectionChange(item.id)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center rounded-lg transition-colors shrink-0 mx-auto justify-center w-9 h-9 relative",
                          isActive
                            ? `${item.activeColor} bg-accent`
                            : `${item.color} hover:bg-accent/50`,
                          isDisabled &&
                            "opacity-30 cursor-not-allowed hover:bg-transparent",
                        )}
                      >
                        {isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          item.icon
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {isStreaming ? `Generating ${item.label}...` : (isDisabled ? "Confirm idea first" : item.label)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </div>
        </div>

        {/* SECTION: Ideas List (Visible only when Expanded) */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            !isCollapsed
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden space-y-0.5">
            <p className="text-[10px] whitespace-nowrap font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5 shrink-0">
              Your Ideas
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-6 shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-6 shrink-0">
                <Lightbulb className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  No ideas yet
                </p>
              </div>
            ) : (
              ideas.map((idea) => {
                const isActive = activeIdeaId === idea.id;
                return (
                  <button
                    key={idea.id}
                    onClick={() => onIdeaSelect(idea.id)}
                    className={cn(
                      "cursor-pointer flex items-start rounded-lg text-left transition-colors group shrink-0 w-[236px] gap-2 px-2.5 py-2",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-foreground",
                    )}
                  >
                    <div className="shrink-0 flex items-center justify-center mt-0.5">
                      {idea.status === "confirmed" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm truncate font-medium">
                        {idea.refinedText || idea.rawText}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {new Date(idea.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                         })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SECTION: Expanded Navigation (Visible only when Expanded & Idea Selected) */}
      <div
        className={cn(
          "border-t border-border px-3 py-2 space-y-0.5 shrink-0 transition-all duration-300 ease-in-out",
          !isCollapsed && activeIdeaId
            ? "grid-rows-[1fr] opacity-100 pb-2 pt-2 border-t-border"
            : "grid-rows-[0fr] opacity-0 pb-0 pt-0 border-t-transparent pointer-events-none",
        )}
        style={{ display: "grid" }}
      >
        <div className="overflow-hidden space-y-0.5">
          <p className="text-[10px] whitespace-nowrap font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 shrink-0">
            Workspace
          </p>

          {SECTION_ITEMS.map((item: SidebarItem) => {
            const isActive = activeSection === item.id;
            const isStreaming = streamingStatus[item.id];
            const isDisabled =
              ideaStatus !== "confirmed" && item.id !== "overview";

            return (
              <Tooltip key={"expanded-" + item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !isDisabled && onSectionChange(item.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center rounded-lg transition-colors shrink-0 w-[236px] gap-2.5 px-2.5 py-1.5 text-sm",
                      isActive
                        ? `${item.activeColor} bg-accent font-medium`
                        : `${item.color} hover:bg-accent/50`,
                      isDisabled &&
                        "opacity-30 cursor-not-allowed hover:bg-transparent",
                    )}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {isStreaming ? `Generating ${item.label}...` : (isDisabled ? "Confirm idea first" : item.label)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};
