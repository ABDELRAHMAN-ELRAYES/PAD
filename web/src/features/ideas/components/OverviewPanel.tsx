import React, { FC, useEffect, useState, useCallback } from "react";
import { Idea } from "../types/models/idea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Cpu,
  Bookmark,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { OverviewPanelProps } from "../types/components/OverviewPanel.types";
import { DiscoveryQuestionnaireForm } from "./DiscoveryQuestionnaireForm";
import { ResearchProgressPanel } from "./ResearchProgressPanel";
import { useResearchStream } from "../hook/useResearchStream";
import { ideaApi } from "../api/ideas.api";

export const OverviewPanel: FC<OverviewPanelProps> = ({
  idea,
  ideaId,
  onIdeaUpdate,
  onSectionChange,
}) => {
  const [questionnaire, setQuestionnaire] = useState<any | null>(null);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Business description streaming state
  const [streamedDesc, setStreamedDesc] = useState<string>("");
  const [isStreamingDesc, setIsStreamingDesc] = useState<boolean>(false);
  const [streamingDescError, setStreamingDescError] = useState<string | null>(null);

  const handleResearchComplete = useCallback((updatedIdea: Idea) => {
    onIdeaUpdate(updatedIdea);
  }, [onIdeaUpdate]);

  // Hook for deep research stream management
  const {
    progress,
    phase,
    message,
    logs,
    status: researchStatus,
    error: researchError,
    startResearch,
  } = useResearchStream(ideaId, handleResearchComplete);

  // Stream business description if missing and in draft status
  useEffect(() => {
    if (idea.businessDescription || idea.status !== "draft" || isStreamingDesc) return;

    let active = true;
    setIsStreamingDesc(true);
    setStreamingDescError(null);
    setStreamedDesc("");

    ideaApi.streamBusinessDescription(ideaId, (data) => {
      if (!active) return;
      if (data.status === "error") {
        setStreamingDescError(data.message || "Failed to generate business description.");
        setIsStreamingDesc(false);
      } else if (data.status === "final") {
        setIsStreamingDesc(false);
        if (data.idea) {
          onIdeaUpdate(data.idea);
        }
      } else if (data.chunk) {
        setStreamedDesc((prev) => prev + data.chunk);
      }
    }).catch((err) => {
      console.error("Error streaming business description:", err);
      if (active) {
        setStreamingDescError(err.message || "Failed to stream business description.");
        setIsStreamingDesc(false);
      }
    });

    return () => {
      active = false;
    };
  }, [idea.businessDescription, idea.status, ideaId, onIdeaUpdate]);

  // 1. Poll/Fetch discovery questionnaire when status is "draft"
  useEffect(() => {
    let active = true;
    let pollTimeout: NodeJS.Timeout;

    const fetchQuestionnaire = async () => {
      if (idea.status !== "draft" && idea.status !== "questionnaire_ready") return;

      try {
        const q = await ideaApi.getQuestionnaire(ideaId);
        if (active) {
          if (q && q.questions) {
            setQuestionnaire(q);
            if (idea.status === "draft") {
              // Automatically refresh idea to questionnaire_ready status
              const updated = await ideaApi.getById(ideaId);
              onIdeaUpdate(updated);
            }
          } else {
            // Keep polling every 2.5 seconds if status is draft
            if (idea.status === "draft") {
              pollTimeout = setTimeout(fetchQuestionnaire, 2500);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch questionnaire:", err);
        if (active && idea.status === "draft") {
          pollTimeout = setTimeout(fetchQuestionnaire, 2500);
        }
      }
    };

    fetchQuestionnaire();

    return () => {
      active = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [idea.status, ideaId]);

  // Fetch questionnaire immediately if status changes to questionnaire_ready
  useEffect(() => {
    if (idea.status === "questionnaire_ready") {
      setIsLoadingQuestionnaire(true);
      ideaApi.getQuestionnaire(ideaId)
        .then((q) => {
          if (q) setQuestionnaire(q);
        })
        .catch((e) => console.error("Error loading questionnaire:", e))
        .finally(() => setIsLoadingQuestionnaire(false));
    }
  }, [idea.status, ideaId]);

  // 2. Submit questionnaire responses handler
  const handleQuestionnaireSubmit = async (responses: any[]) => {
    const responseRecord = await ideaApi.submitQuestionnaire(ideaId, responses);
    // Refresh idea status in parent layout
    const updatedIdea = await ideaApi.getById(ideaId);
    onIdeaUpdate(updatedIdea);
  };

  // 3. Automatically trigger deep research when status is questionnaire_complete
  useEffect(() => {
    if (idea.status === "questionnaire_complete") {
      startResearch();
    }
  }, [idea.status, startResearch]);

  // 4. Confirm project scope baseline handler
  const handleConfirmScope = async () => {
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const confirmedIdea = await ideaApi.confirm(ideaId);
      onIdeaUpdate(confirmedIdea);
    } catch (err: any) {
      setConfirmError(err?.message || "Failed to confirm project scope.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Helper to render current state status badge
  const renderStatusBadge = () => {
    switch (idea.status) {
      case "confirmed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15 text-[10px] font-semibold">
            <CheckCircle className="mr-1 h-3 w-3 shrink-0" />
            Approved Scope
          </Badge>
        );
      case "research_complete":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/15 text-[10px] font-semibold animate-pulse">
            <BookOpen className="mr-1 h-3 w-3 shrink-0" />
            Research Complete
          </Badge>
        );
      case "researching":
        return (
          <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/15 text-[10px] font-semibold">
            <Loader2 className="mr-1 h-3 w-3 shrink-0 animate-spin" />
            Deep Researching...
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15 text-[10px] font-semibold">
            <Clock className="mr-1 h-3 w-3 shrink-0" />
            Discovery Phase
          </Badge>
        );
    }
  };

  // --- Sub-rendering: Render Blueprint results panel ---
  const renderBlueprintContent = () => {
    const result = idea.researchResult;
    if (!result) return null;

    const sections = [
      {
        id: "summary",
        title: "Executive Summary",
        icon: Lightbulb,
        color: "text-amber-500",
        content: result.synthesisSummary,
      },
      {
        id: "understanding",
        title: "Product Understanding",
        icon: FileText,
        color: "text-blue-500",
        content: result.understanding,
      },
      {
        id: "competitors",
        title: "Competitor Analysis",
        icon: TrendingUp,
        color: "text-rose-500",
        content: result.competitors,
      },
      {
        id: "market",
        title: "Market & Persona Profiling",
        icon: BookOpen,
        color: "text-emerald-500",
        content: result.marketAnalysis,
      },
      {
        id: "architecture",
        title: "System Architecture",
        icon: Cpu,
        color: "text-violet-500",
        content: result.architecture,
      },
      {
        id: "scope",
        title: "MVP Backlog & Roadmap",
        icon: CheckCircle,
        color: "text-indigo-500",
        content: result.suggestedScope,
      },
      {
        id: "risks",
        title: "Risks & Mitigations",
        icon: AlertTriangle,
        color: "text-amber-600",
        content: result.risksAndConcerns,
      },
    ];

    const bibliography = result.sources || [];

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-md font-bold tracking-tight text-foreground">Deep Research Project Blueprint</h3>
          <p className="text-xs text-muted-foreground">
            Review the 7-phase structural system proposal generated from our deep agentic searches.
          </p>
        </div>

        {/* Collapsible Blueprint Sections */}
        <Accordion type="single" collapsible defaultValue="summary" className="w-full space-y-3">
          {sections.map((sec) => {
            const IconComponent = sec.icon;
            return (
              <AccordionItem
                key={sec.id}
                value={sec.id}
                className="border border-border/80 bg-card rounded-2xl overflow-hidden px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-muted/50 ${sec.color}`}>
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      {sec.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1 text-xs text-muted-foreground leading-relaxed pl-11 select-text">
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-[11.5px] whitespace-pre-line">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.content}</ReactMarkdown>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Interactive Bibliography/Sources */}
        {bibliography.length > 0 && (
          <Card className="border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b pb-2 mb-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Bookmark className="h-4 w-4" />
                <span>Search Sources Bibliography</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar select-text pr-1">
                {bibliography.map((src: any, idx: number) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-muted hover:border-primary/30 bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-[10.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {src.title || "Wikipedia Source"}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground truncate flex items-center gap-1">
                        <span>{src.url}</span>
                        <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderBusinessDescriptionCard = (description: string, isStreaming: boolean, error: string | null) => {
    return (
      <Card className="border-border/80 bg-card rounded-2xl overflow-hidden shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Lightbulb className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">AI-Generated Business Concept</h3>
            </div>
            {isStreaming && (
              <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 animate-pulse text-[10px] font-semibold">
                <Loader2 className="mr-1 h-3 w-3 animate-spin shrink-0" />
                Streaming...
              </Badge>
            )}
          </div>

          {error && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="prose prose-neutral dark:prose-invert max-w-none text-[11.5px] whitespace-pre-line leading-relaxed select-text">
            {description ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
            ) : (
              !error && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground animate-pulse">Initializing business concept analysis...</p>
                </div>
              )
            )}
            {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/70 animate-pulse align-middle" />}
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Main Render Engine ---
  const renderFlow = () => {
    switch (idea.status) {
      case "draft":
        if (isStreamingDesc || (streamedDesc && !idea.businessDescription)) {
          return null; // Description is streaming, don't show the big loader
        }
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-border/60 bg-muted/10 rounded-2xl text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="space-y-1">
              <h4 className="font-semibold text-xs">Generating Questionnaire</h4>
              <p className="text-[10.5px] text-muted-foreground max-w-xs leading-relaxed">
                Business concept analysis complete. We are now generating your customized discovery questionnaire...
              </p>
            </div>
          </div>
        );

      case "questionnaire_ready":
        if (isLoadingQuestionnaire || !questionnaire) {
          return (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          );
        }
        return (
          <DiscoveryQuestionnaireForm
            ideaId={ideaId}
            questions={questionnaire.questions}
            onSubmit={handleQuestionnaireSubmit}
          />
        );

      case "questionnaire_complete":
      case "researching":
        return (
          <ResearchProgressPanel
            progress={progress}
            phase={phase}
            message={message}
            logs={logs}
            status={researchStatus}
            error={researchError}
            onRetry={startResearch}
          />
        );

      case "research_complete":
      case "confirmed":
        return renderBlueprintContent();

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 @container">
      {/* Header and Global Status */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight">Project Overview</h2>
            {renderStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your initial project scope, analyze gaps, and finalize structural requirements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Interactive flow steps / Blueprint Accordion */}
        <div className="space-y-6 @4xl:col-span-2 @container">
          {(idea.businessDescription || isStreamingDesc || streamedDesc) && (
            renderBusinessDescriptionCard(idea.businessDescription || streamedDesc, isStreamingDesc, streamingDescError)
          )}
          {renderFlow()}
        </div>

        {/* Right Column: Sidebar lifecycle list & Scope Confirmation CTA */}
        <div className="space-y-6 @4xl:col-span-1 @container">
          {/* Project Lifecycle Checklist */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Lifecycle</h3>
              <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-muted-foreground/20 select-none">
                
                {/* Step 1: Concept Intake */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 flex items-center justify-center shrink-0 z-10 bg-background">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">1. Concept Intake</h4>
                    <p className="text-[10px] text-muted-foreground">Submit raw project description</p>
                  </div>
                </div>

                {/* Step 2: Discovery Questionnaire */}
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border
                    ${idea.status !== "draft"
                      ? "bg-green-500/10 border-green-500/20 text-green-600"
                      : "bg-muted text-muted-foreground/30 border-transparent"
                    }`}
                  >
                    {idea.status !== "draft" ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${idea.status !== "draft" ? "text-foreground" : "text-muted-foreground"}`}>
                      2. Discovery Questionnaire
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Answer tailored refinement questions</p>
                  </div>
                </div>

                {/* Step 3: Deep Research Agent */}
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border
                    ${idea.status === "research_complete" || idea.status === "confirmed"
                      ? "bg-green-500/10 border-green-500/20 text-green-600"
                      : idea.status === "researching"
                        ? "bg-violet-500/10 border-violet-500/20 text-violet-600 animate-pulse"
                        : "bg-muted text-muted-foreground/30 border-transparent"
                    }`}
                  >
                    {idea.status === "research_complete" || idea.status === "confirmed" ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold 
                      ${idea.status === "researching" || idea.status === "research_complete" || idea.status === "confirmed" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      3. Deep Research Agent
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Compile web search reports</p>
                  </div>
                </div>

                {/* Step 4: Lock Blueprints */}
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border
                    ${idea.status === "confirmed"
                      ? "bg-green-500/10 border-green-500/20 text-green-600"
                      : "bg-muted text-muted-foreground/30 border-transparent"
                    }`}
                  >
                    {idea.status === "confirmed" ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${idea.status === "confirmed" ? "text-foreground" : "text-muted-foreground"}`}>
                      4. Lock Blueprints
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Confirm scope to launch active panels</p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Scope Confirmation / Active Navigation Hub */}
          {idea.status === "research_complete" && (
            <Card className="rounded-2xl border-indigo-500/10 bg-linear-to-br from-indigo-500/5 via-violet-500/5 to-transparent shadow-xs">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approve Scope</h3>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  Confirming this project locks in the current specification baseline and opens the active design workspace.
                </p>
                {confirmError && (
                  <div className="text-[10.5px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                    {confirmError}
                  </div>
                )}
                <Button
                  onClick={handleConfirmScope}
                  disabled={isConfirming}
                  className="w-full rounded-xl font-semibold shadow-md hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white cursor-pointer py-4 text-xs"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Locking baseline...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Project Scope
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {idea.status === "confirmed" && (
            <Card className="rounded-2xl border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs">
                      Scope Approved & Locked
                    </h3>
                    <p className="text-[10.5px] text-emerald-600/90 dark:text-emerald-500/90 leading-relaxed">
                      You are in the design phase. Navigate to any section to start mapping system blueprints.
                    </p>
                  </div>
                </div>

                {onSectionChange && (
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {[
                      { id: "documents", label: "Requirements Specifications", desc: "PRD & BRD documents" },
                      { id: "diagrams", label: "Architecture Diagrams", desc: "System ERD & Flows" },
                      { id: "features", label: "Features Backlog", desc: "User stories & checklist" },
                      { id: "workflow", label: "Implementation Workflows", desc: "Active step builder" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id as any)}
                        className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 bg-background/60 hover:bg-background/95 hover:border-emerald-500/30 text-left transition-all duration-200 cursor-pointer shadow-xs"
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                            {item.label}
                          </span>
                          <span className="text-[9.5px] text-muted-foreground mt-0.5">{item.desc}</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
