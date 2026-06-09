"use client";

import { FC, useEffect, useState, useCallback } from "react";
import { diagramApi } from "../api/diagrams.api";
import { Diagram, DiagramType } from "../types/models/diagrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, Save, Sparkles, Code, Eye } from "lucide-react";
import { useStreaming } from "@/components/providers/StreamingProvider";

import { DIAGRAM_ICONS, DIAGRAM_LABELS } from "@/config/diagrams";
import { parsePartialMermaid } from "@/lib/utils/diagram";
import { DiagramCanvas } from "./DiagramCanvas";
import { DiagramsPanelProps } from "../types/components/DiagramsPanel.types";

export const DiagramsPanel: FC<DiagramsPanelProps> = ({ ideaId }) => {
  const { setPhaseStreaming } = useStreaming();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>("ERD");
  const [streamingCode, setStreamingCode] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<Record<string, "diagram" | "code">>({});

  const fetchData = useCallback(async () => {
    try {
      const diagramsData = await diagramApi.getByIdeaId(ideaId);
      setDiagrams(diagramsData);

      const codeMap: Record<string, string> = {};
      diagramsData.forEach((d) => {
        codeMap[d.id] = d.mermaidCode;
      });
      setEditedCode(codeMap);

      if (diagramsData.length > 0) {
        setActiveTab(diagramsData[0].type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diagrams");
    } finally {
      setIsLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isGenerating) {
      setPhaseStreaming("diagrams", true);
    } else {
      setPhaseStreaming("diagrams", false);
    }
  }, [isGenerating, setPhaseStreaming]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setStreamingCode({});
      setPhaseStreaming("diagrams", true);

      await diagramApi.generateStream(ideaId, (data) => {
        if (data.chunk && data.type) {
          setStreamingCode((prev) => ({
            ...prev,
            [data.type]: data.fullText || (prev[data.type] || "") + data.chunk,
          }));
          setActiveTab(data.type);
        }

        if (data.status === "final") {
          setIsGenerating(false);
          setStreamingCode({});
          if (data.diagrams) {
            setDiagrams(data.diagrams);
            const codeMap: Record<string, string> = {};
            data.diagrams.forEach((d: any) => {
              codeMap[d.id] = d.mermaidCode;
            });
            setEditedCode(codeMap);
            if (data.diagrams.length > 0) setActiveTab(data.diagrams[0].type);
          }
          setPhaseStreaming("diagrams", false);
        }

        if (data.status === "error") {
          setIsGenerating(false);
          setError(data.message || "Failed to generate diagrams");
          setStreamingCode({});
          setPhaseStreaming("diagrams", false);
        }
      });
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : "Failed to generate diagrams");
      setStreamingCode({});
      setPhaseStreaming("diagrams", false);
    }
  };

  const handleSave = async (diagram: Diagram) => {
    const newCode = editedCode[diagram.id];
    if (newCode === diagram.mermaidCode) return;

    setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
    try {
      const updated = await diagramApi.update(diagram.id, {
        mermaidCode: newCode,
        changelog: "Manual edit",
      });
      setDiagrams((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
    }
  };

  const handleRegenerate = async (diagram: Diagram) => {
    setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
    try {
      await diagramApi.regenerate(diagram.id);
      // For regeneration, we might still use a one-off stream if desired, 
      // but for now let's keep it simple as the user didn't explicitly ask for regen stream
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const getDiagramByType = (type: string): Diagram | undefined =>
    diagrams.find((d) => d.type === type);

  const activeDiagram = getDiagramByType(activeTab);
  const activeStreaming = streamingCode[activeTab];
  const activeSaving = activeDiagram ? isSaving[activeDiagram.id] : false;
  const activeHasChanges = activeDiagram
    ? editedCode[activeDiagram.id] !== activeDiagram.mermaidCode
    : false;
  const activeMode = viewMode[activeTab] || "diagram";

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {diagrams.length === 0 && !isGenerating ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-dashed">
            <CardContent className="py-12 text-center">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium mb-1">No Diagrams Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate diagrams to visualize your architecture.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Diagrams
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full flex flex-col overflow-hidden">
          {/* Unified Page Header */}
          <div className="flex items-center justify-between border-b px-6 py-2 bg-card/50 backdrop-blur-sm h-14 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Diagrams</h2>
              <Separator orientation="vertical" className="h-4" />

              {/* Tab list rendered inline next to title */}
              <TabsList className="h-8 bg-muted/50 p-0.5 border">
                {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map((type) => {
                  const diagram = getDiagramByType(type);
                  const streaming = streamingCode[type];
                  return (
                    <TabsTrigger
                      key={type}
                      value={type}
                      disabled={!diagram && !streaming}
                      className="flex items-center gap-1.5 text-xs px-2.5 h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      {DIAGRAM_ICONS[type]}
                      {DIAGRAM_LABELS[type]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Right actions and switcher for active tab */}
            <div className="flex items-center gap-3">
              {activeDiagram && (
                <>
                  {!activeStreaming && (
                    <div className="flex items-center bg-muted/55 p-0.5 border rounded-lg">
                      <Button
                        variant={activeMode === "diagram" ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-7 px-3 text-xs font-medium transition-all ${activeMode === "diagram" ? "shadow-sm bg-background" : "text-muted-foreground"}`}
                        onClick={() => setViewMode((prev) => ({ ...prev, [activeTab]: "diagram" }))}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Diagram
                      </Button>
                      <Button
                        variant={activeMode === "code" ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-7 px-3 text-xs font-medium transition-all ${activeMode === "code" ? "shadow-sm bg-background" : "text-muted-foreground"}`}
                        onClick={() => setViewMode((prev) => ({ ...prev, [activeTab]: "code" }))}
                      >
                        <Code className="h-3.5 w-3.5 mr-1" />
                        Code
                      </Button>
                    </div>
                  )}

                  {!activeStreaming && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(activeDiagram)}
                        disabled={activeSaving || isGenerating}
                        className="h-7 text-xs"
                      >
                        <RefreshCw
                          className={`h-3 w-3 mr-1 ${activeSaving ? "animate-spin" : ""}`}
                        />
                        Regen
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(activeDiagram)}
                        disabled={activeSaving || !activeHasChanges || isGenerating}
                        className="h-7 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </>
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1 border rounded-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Generating...</span>
                </div>
              )}
            </div>
          </div>

          {/* Canvas or code space occupying full remaining viewport */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-background">
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive/15 border border-destructive/30 text-destructive px-4 py-2.5 rounded-lg text-xs z-50 flex items-center gap-2 shadow-lg backdrop-blur-md">
                <span>{error}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/20 rounded-full" onClick={() => setError(null)}>×</Button>
              </div>
            )}

            {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map((type) => {
              const diagram = getDiagramByType(type);
              const streaming = streamingCode[type];

              if (!diagram && !streaming) return null;

              const rawCode = streaming || (diagram ? editedCode[diagram.id] : "");
              const code = streaming ? parsePartialMermaid(rawCode) : rawCode;
              const mode = viewMode[type] || "diagram";

              return (
                <TabsContent key={type} value={type} className="h-full w-full p-0 m-0 border-0 flex flex-col focus-visible:outline-none">
                  {mode === "diagram" || streaming ? (
                    <DiagramCanvas code={code} />
                  ) : (
                    <div className="flex-1 w-full h-full p-6 flex flex-col bg-background">
                      <textarea
                        className="flex-1 w-full h-full font-mono text-xs p-4 border rounded-lg bg-muted/10 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed shadow-inner"
                        value={code}
                        onChange={(e) => {
                          if (diagram) {
                            setEditedCode((prev) => ({
                              ...prev,
                              [diagram.id]: e.target.value,
                            }));
                          }
                        }}
                        disabled={!!streaming}
                        spellCheck={false}
                      />
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      )}
    </div>
  );
};
