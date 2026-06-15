import React, { FC, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DeepResearchIcon } from "./DeepResearchIcon";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResearchLog {
  timestamp: string;
  message: string;
}

interface ResearchProgressPanelProps {
  progress: number;
  phase: string;
  message: string;
  logs: ResearchLog[];
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
  onRetry?: () => void;
}

export const ResearchProgressPanel: FC<ResearchProgressPanelProps> = ({
  progress,
  phase,
  message,
  logs,
  status,
  error,
  onRetry,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getPhaseNameAr = (p: string) => {
    switch (p?.toLowerCase()) {
      case "init":
        return "Initializing Deep Research Agent...";
      case "understanding":
        return "Analyzing Requirements & Problem Statement...";
      case "competitors":
        return "Scanning Competitor Landscape & Solutions...";
      case "market":
        return "Assessing Market Trends & Demographics...";
      case "architecture":
        return "Defining Tech Stack & System Architecture...";
      case "scope":
        return "Structuring Product Scope & MVP Milestones...";
      case "risks":
        return "Evaluating Technical & Operational Risks...";
      case "synthesis":
        return "Synthesizing Final System Blueprint...";
      default:
        return p || "Researching...";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Animated Pixel Icon Area */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative p-6 rounded-full bg-linear-to-br from-primary/10 to-indigo-500/5 dark:from-primary/20 dark:to-indigo-500/10 border border-primary/20 shadow-md">
          <DeepResearchIcon className="w-20 h-20 text-primary animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-foreground tracking-tight">
            {status === "failed" ? "Research Session Failed" : "Deep Research Agent Running"}
          </h4>
          <p className="text-xs text-muted-foreground max-w-md">
            {status === "failed" 
              ? "An error occurred while compiling search results."
              : "Analyzing and searching the web to formulate a complete product specifications blueprint."
            }
          </p>
        </div>
      </div>

      {status === "failed" ? (
        <Card className="w-full border-destructive/20 bg-destructive/5 rounded-2xl">
          <CardContent className="p-5 flex flex-col items-center gap-4">
            <div className="flex items-start gap-2.5 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error || "An unexpected error occurred during deep research."}</span>
            </div>
            {onRetry && (
              <Button onClick={onRetry} className="rounded-xl px-6 bg-destructive text-white hover:bg-destructive/90 text-xs">
                Retry Research
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="w-full space-y-6">
          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-primary tracking-wide">{getPhaseNameAr(phase)}</span>
              <span className="font-mono text-muted-foreground">{progress}%</span>
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-violet-600 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/10 text-primary-foreground text-[10px] w-fit mx-auto max-w-full shadow-xs">
              <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
              <span className="truncate italic text-foreground/80 dark:text-foreground/90 font-medium">
                {message || "Retrieving web sources and executing agentic iterations..."}
              </span>
            </div>
          </div>

          {/* Real-time Search Logs View */}
          <Card className="w-full border-border/80 bg-neutral-900 dark:bg-black/40 rounded-2xl shadow-xs">
            <CardContent className="p-4 flex flex-col h-44">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Agent Activity Feed</span>
              </div>
              <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-2 text-[10.5px] font-mono text-neutral-300 custom-scrollbar select-text pr-1">
                {logs.length === 0 ? (
                  <p className="text-neutral-500 italic">Starting engine...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex gap-2.5 items-start leading-relaxed border-b border-white/5 pb-1">
                      <span className="text-neutral-500 shrink-0 select-none">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-neutral-400 shrink-0 select-none">&gt;</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
