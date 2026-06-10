"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Send,
  ArrowRight,
} from "lucide-react";

import { OverviewPanelProps } from "../types/components/OverviewPanel.types";
import { useOverviewPanel } from "../hook/useOverviewPanel";

export const OverviewPanel: FC<OverviewPanelProps> = ({
  idea,
  ideaId,
  onIdeaUpdate,
  onSectionChange,
}) => {
  const {
    isAnalyzing,
    isConfirming,
    isSubmittingAnswers,
    error,
    answers,
    hasSubmittedAnswers,
    streamingText,
    handleAnalyze,
    handleConfirm,
    handleSubmitAnswers,
    handleAnswerChange,
  } = useOverviewPanel(idea, ideaId, onIdeaUpdate);

  // Calculate dynamic completeness/readiness score
  const getReadinessScore = () => {
    if (idea.status === "confirmed") return 100;
    if (!idea.analysisResult) return 15;
    const questions = idea.analysisResult.clarifyingQuestions || [];
    if (questions.length === 0) return 90;
    
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).filter(
      (k) => answers[Number(k)]?.trim()
    ).length;
    
    // Starting at 50% for completed analysis, scaling to 90%
    return Math.min(
      90,
      Math.round(50 + (answeredCount / totalQuestions) * 40)
    );
  };

  const readiness = getReadinessScore();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 @container">
      {/* Header and Global Status */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight">Project Overview</h2>
            <Badge 
              variant={idea.status === "confirmed" ? "default" : "secondary"}
              className={`text-[10px] font-semibold ${
                idea.status === "confirmed"
                  ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/15"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15"
              }`}
            >
              {idea.status === "confirmed" ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3 shrink-0" />
                  Confirmed Scope
                </>
              ) : (
                <>
                  <Clock className="mr-1 h-3 w-3 shrink-0" />
                  Concept Draft
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your initial project scope, analyze gaps, and finalize structural requirements.
          </p>
        </div>
        
        {/* Quick Re-Analyze for draft projects */}
        {idea.status === "draft" && idea.analysisResult && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-8 border-border/80 hover:bg-muted/50 cursor-pointer transition-all duration-200"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-1.5 h-3.5 w-3.5" />
                Re-Analyze
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/5 dark:bg-destructive/10 border border-destructive/10 dark:border-destructive/20 text-destructive px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Workspace Dashboard */}
      <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Project Brief & AI Diagnostic Details */}
        <div className="space-y-6 @4xl:col-span-2 @container">
          
          {/* Executive Pitch Summary Card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 dark:from-violet-500/10 dark:to-indigo-500/5 p-5 shadow-xs">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.06] pointer-events-none select-none">
              <Brain className="h-24 w-24" />
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm text-foreground tracking-tight">Executive Pitch</h3>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground/90">
                  {idea.refinedText || idea.rawText}
                </p>
              </div>
            </div>
          </div>

          {/* AI Diagnostic Insights Grid */}
          {idea.analysisResult ? (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                Strategic AI Analysis
              </h3>
              
              <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-4">
                
                {/* Scope Gaps */}
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold text-xs uppercase tracking-wider">
                    <ListChecks className="h-4 w-4" />
                    <span>Scope Gaps</span>
                  </div>
                  {idea.analysisResult.missingDetails.length > 0 ? (
                    <ul className="space-y-2 text-[11px] text-muted-foreground/90 leading-relaxed">
                      {idea.analysisResult.missingDetails.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic">No scope gaps identified.</p>
                  )}
                </div>

                {/* Value Boosters */}
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-semibold text-xs uppercase tracking-wider">
                    <Lightbulb className="h-4 w-4" />
                    <span>Value Additions</span>
                  </div>
                  {idea.analysisResult.complementarySuggestions.length > 0 ? (
                    <ul className="space-y-2 text-[11px] text-muted-foreground/90 leading-relaxed">
                      {idea.analysisResult.complementarySuggestions.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic">No value additions identified.</p>
                  )}
                </div>

                {/* Risks & Constraints */}
                <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 dark:bg-rose-500/10 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Risks & Rules</span>
                  </div>
                  {idea.analysisResult.constraintsAndRisks.length > 0 ? (
                    <ul className="space-y-2 text-[11px] text-muted-foreground/90 leading-relaxed">
                      {idea.analysisResult.constraintsAndRisks.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-500 mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic">No major risks flagged.</p>
                  )}
                </div>

              </div>
            </div>
          ) : (
            /* AI Diagnostics Intake Empty State */
            !isAnalyzing && (
              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-8 flex flex-col items-center text-center gap-4">
                <div className="rounded-full bg-primary/10 p-3.5 text-primary">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="font-semibold text-sm">Analyze Project Concept</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI will map your initial description to identify requirements gaps, suggest boosters, and construct a Q&A interview path.
                  </p>
                </div>
                <Button 
                  onClick={handleAnalyze} 
                  className="rounded-xl px-5 py-4 text-xs font-semibold cursor-pointer shadow-md hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] bg-primary text-primary-foreground"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze Concept with AI
                </Button>
              </div>
            )
          )}

          {/* Q&A Clarifying Questions (Refinement interview) */}
          {idea.analysisResult && idea.analysisResult.clarifyingQuestions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-primary font-semibold text-sm border-b pb-2">
                <HelpCircle className="h-4 w-4" />
                <span>Scope Refinement Wizard (AI Interview)</span>
              </div>
              
              <div className="space-y-4">
                {idea.analysisResult.clarifyingQuestions.map(
                  (question: string, idx: number) => (
                    <div key={idx} className="space-y-2 animate-in fade-in duration-300">
                      <div className="flex items-start gap-2.5">
                        <span className="text-primary mt-0.5 font-bold text-[10px] tracking-wide bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5 shrink-0 select-none">
                          Q{idx + 1}
                        </span>
                        <span className="font-semibold text-[11.5px] text-foreground/90 leading-relaxed">{question}</span>
                      </div>
                      {idea.status === "draft" ? (
                        <textarea
                          className="w-full px-3.5 py-2.5 text-xs border border-border bg-muted/20 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 min-h-[60px] max-h-[140px] resize-y rounded-xl transition-all duration-200 custom-scrollbar placeholder:text-muted-foreground/45"
                          placeholder="Provide details for this question..."
                          value={answers[idx] || ""}
                          onChange={(e) =>
                            handleAnswerChange(idx, e.target.value)
                          }
                          disabled={isSubmittingAnswers}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic pl-8">Scope finalized.</p>
                      )}
                    </div>
                  ),
                )}
                
                {idea.status === "draft" && (
                  <Button
                    onClick={handleSubmitAnswers}
                    disabled={
                      isSubmittingAnswers ||
                      Object.values(answers).every((a) => !a?.trim())
                    }
                    className="w-full rounded-xl py-2.5 font-medium transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] text-xs shadow-sm cursor-pointer"
                    variant="secondary"
                    size="sm"
                  >
                    {isSubmittingAnswers ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Updating specifications...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-3.5 w-3.5" />
                        Submit Answers & Update Proposal
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Streaming/Loading State indicator in-place */}
          {isAnalyzing && streamingText && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
                AI Analysis Processing...
              </h3>
              <Card className="border-primary/10 bg-primary/5 shadow-xs rounded-2xl">
                <CardContent className="p-4 leading-relaxed">
                  <div className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {streamingText}
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>

        {/* Right Column: Readiness Index, Lifecycle Steps, Scope Approval CTA */}
        <div className="space-y-6 @4xl:col-span-1 @container">
          
          {/* Project Readiness Meter */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Readiness Index</span>
                <span className="text-2xl font-black text-primary font-mono select-none">{readiness}%</span>
              </div>
              
              <div className="relative w-full h-2.5 bg-muted/60 dark:bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                {readiness <= 15 && "Concept drafted. Run AI analysis to identify scope gaps and project roadmap."}
                {readiness > 15 && readiness <= 50 && "Initial AI scope analysis complete. Review missing details and risks."}
                {readiness > 50 && readiness < 90 && "Refining scope. Answer clarifying questions to lock in requirements."}
                {readiness === 90 && "Requirements finalized! Ready to approve scope and build design blueprints."}
                {readiness === 100 && "Project approved! Blueprinting tools unlocked (Documents, Diagrams, Features, Workflows)."}
              </p>
            </CardContent>
          </Card>

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
                
                {/* Step 2: AI Diagnostics */}
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border
                    ${idea.analysisResult 
                      ? "bg-green-500/10 border-green-500/20 text-green-600" 
                      : "bg-muted text-muted-foreground/30 border-transparent"
                    }`}
                  >
                    {idea.analysisResult ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${idea.analysisResult ? "text-foreground" : "text-muted-foreground"}`}>
                      2. AI Analysis
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Map scope, gaps, and risks</p>
                  </div>
                </div>
                
                {/* Step 3: Scope Refinement */}
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border
                    ${(idea.analysisResult && idea.analysisResult.clarifyingQuestions.length === 0) || idea.status === "confirmed" || hasSubmittedAnswers
                      ? "bg-green-500/10 border-green-500/20 text-green-600"
                      : idea.analysisResult && idea.analysisResult.clarifyingQuestions.length > 0
                        ? "bg-violet-500/10 border-violet-500/20 text-violet-600 animate-pulse"
                        : "bg-muted text-muted-foreground/30 border-transparent"
                    }`}
                  >
                    {(idea.analysisResult && idea.analysisResult.clarifyingQuestions.length === 0) || idea.status === "confirmed" || hasSubmittedAnswers ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <HelpCircle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold 
                      ${idea.analysisResult && idea.analysisResult.clarifyingQuestions.length > 0 ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      3. Scope Refinement
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Answer questions to solidify specifications</p>
                  </div>
                </div>
                
                {/* Step 4: Finalize Blueprints */}
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

          {/* Scope Confirmation / Active Project navigation Hub */}
          {idea.status === "draft" ? (
            idea.analysisResult && (
              <Card className="rounded-2xl border-violet-500/10 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approve Scope</h3>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    Confirming this project locks in the current specification baseline and opens the active design workspace.
                  </p>
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isConfirming || (idea.analysisResult.clarifyingQuestions.length > 0 && !hasSubmittedAnswers)} 
                    className="w-full rounded-xl font-semibold shadow-md hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white cursor-pointer py-4 text-xs"
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
                  {idea.analysisResult.clarifyingQuestions.length > 0 && !hasSubmittedAnswers && (
                    <p className="text-[10px] text-amber-600/70 text-center">
                      Tip: Complete the Q&A Refinement before locking.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            /* Active Project Navigation Hub (Confirmed) */
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
                  <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2.5 pt-2">
                    {[
                      { id: "documents", label: "Requirements", desc: "Specifications" },
                      { id: "diagrams", label: "Architecture", desc: "System ERD" },
                      { id: "features", label: "Features", desc: "Backlog list" },
                      { id: "workflow", label: "Workflows", desc: "Flow builder" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id as any)}
                        className="flex flex-col items-start p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 bg-background/60 hover:bg-background/95 hover:border-emerald-500/30 text-left transition-all duration-200 cursor-pointer shadow-xs"
                      >
                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                          {item.label}
                          <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-[9.5px] text-muted-foreground mt-0.5">{item.desc}</span>
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
