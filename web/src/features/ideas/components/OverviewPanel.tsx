import { FC, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { OverviewPanelProps } from "../types/components/OverviewPanel.types";
import { DiscoveryQuestionnaireForm } from "./DiscoveryQuestionnaireForm";
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
  const [selectedDocs, setSelectedDocs] = useState<string[]>(["BRD", "PRD", "SRS"]);
  const [selectedDiags, setSelectedDiags] = useState<string[]>(["SYSTEM_ARCHITECTURE", "DATABASE_ERD", "USER_FLOW"]);

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
    await ideaApi.submitQuestionnaire(ideaId, responses);
    // Refresh idea status in parent layout
    const updatedIdea = await ideaApi.getById(ideaId);
    onIdeaUpdate(updatedIdea);
  };

  // 3. Confirm project scope baseline handler
  const handleConfirmScope = async () => {
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const confirmedIdea = await ideaApi.confirm(ideaId, {
        selectedDocuments: selectedDocs,
        selectedDiagrams: selectedDiags
      });
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
      case "questionnaire_complete":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/15 text-[10px] font-semibold">
            <CheckCircle className="mr-1 h-3 w-3 shrink-0" />
            Questionnaire Completed
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

  const renderScopeConfiguration = () => {
    const documentsList = [
      { type: "BRD", name: "Business Requirements (BRD)", desc: "Core business goals and targets" },
      { type: "PRD", name: "Product Requirements (PRD)", desc: "Functional specifications and user stories" },
      { type: "SRS", name: "Software Requirements (SRS)", desc: "Technical system specifications" },
      { type: "FRS", name: "Functional Requirements (FRS)", desc: "Detailed behavioral and flow rules" },
      { type: "SYSTEM_ARCH", name: "System Architecture (SAD)", desc: "High-level modular blueprint" },
      { type: "API_SPEC", name: "API Specification", desc: "Endpoint and integration contracts" },
      { type: "TEST_PLAN", name: "QA & Test Plan", desc: "Strategy and validation test cases" },
      { type: "USER_MANUAL", name: "User Guide & Manual", desc: "End-user guide and documentation" },
      { type: "SECURITY_PLAN", name: "Security & Compliance", desc: "Threat modeling and policy audit" }
    ];

    const diagramsList = [
      { type: "SYSTEM_ARCHITECTURE", name: "System Architecture", desc: "Core backend/frontend mapping" },
      { type: "DATABASE_ERD", name: "Database ERD", desc: "Database tables and relationships" },
      { type: "USER_FLOW", name: "User Flow", desc: "Visual navigation pathways" },
      { type: "SEQUENCE", name: "Sequence", desc: "Step-by-step transaction logic" },
      { type: "COMPONENT", name: "Component", desc: "Modular architecture boundaries" },
      { type: "DEPLOYMENT", name: "Deployment", desc: "Docker & cloud node layouts" },
      { type: "CLASS", name: "Class Diagram", desc: "Object-oriented code structure" },
      { type: "STATE", name: "State Machine", desc: "Entity status transition paths" },
      { type: "USE_CASE", name: "Use Case", desc: "Actor-system relationships" },
      { type: "ACTIVITY", name: "Activity Flow", desc: "Logical execution paths" }
    ];

    const toggleDocument = (type: string) => {
      setSelectedDocs(prev => 
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
    };

    const toggleDiagram = (type: string) => {
      setSelectedDiags(prev => 
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
    };

    return (
      <Card className="rounded-2xl border border-indigo-500/10 bg-linear-to-b from-card to-background shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground">Customize Project Scope</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Select which document specifications and architectural diagrams you need for this project.
          </p>
        </div>
        <CardContent className="p-6 space-y-6">
          {/* Documents Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">1. Document Specifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documentsList.map((doc) => {
                const isChecked = selectedDocs.includes(doc.type);
                return (
                  <div
                    key={doc.type}
                    onClick={() => toggleDocument(doc.type)}
                    className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-305 cursor-pointer select-none
                      ${isChecked 
                        ? "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10" 
                        : "border-border/60 bg-muted/10 hover:border-indigo-500/20 hover:bg-muted/20"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="mt-1 h-3.5 w-3.5 rounded-sm border-muted-foreground/30 accent-indigo-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold transition-colors ${isChecked ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"}`}>
                        {doc.name}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                        {doc.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagrams Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">2. System Diagrams</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {diagramsList.map((diag) => {
                const isChecked = selectedDiags.includes(diag.type);
                return (
                  <div
                    key={diag.type}
                    onClick={() => toggleDiagram(diag.type)}
                    className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-305 cursor-pointer select-none
                      ${isChecked 
                        ? "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10" 
                        : "border-border/60 bg-muted/10 hover:border-violet-500/20 hover:bg-muted/20"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="mt-1 h-3.5 w-3.5 rounded-sm border-muted-foreground/30 accent-violet-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-semibold transition-colors ${isChecked ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                        {diag.name}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                        {diag.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Main Render Engine ---
  const renderFlow = () => {
    switch (idea.status) {
      case "draft":
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
      case "confirmed":
        return (
          <div className="space-y-6">
            {renderScopeConfiguration()}
          </div>
        );

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
            Manage your initial project scope, analyze requirements, and finalize architectural deliverables.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Flow steps & Scope Configuration */}
        <div className="space-y-6 @4xl:col-span-2 @container">
          {renderFlow()}
        </div>

        {/* Right Column: Lifecycle checklist & Confirmation CTA */}
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

                {/* Step 3: Lock Scope */}
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
                      3. Lock Project Scope
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Confirm scope to launch design panels</p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Scope Confirmation CTA */}
          {idea.status === "questionnaire_complete" && (
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
                      { id: "ir", label: "IR Engine", desc: "Intermediate representation core" },
                      { id: "documents", label: "Requirements Specifications", desc: "PRD & BRD documents" },
                      { id: "diagrams", label: "Architecture Diagrams", desc: "System ERD & Flows" },
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
