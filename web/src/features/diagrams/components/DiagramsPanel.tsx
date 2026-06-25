import { FC, useState } from "react";
import { DiagramsPanelProps } from "../types/components/DiagramsPanel.types";
import { DiagramType } from "../types/models/diagrams";
import { useDiagramsPage } from "../hook/useDiagramsPage";
import { DiagramDetailView } from "./DiagramDetailView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Play, Plus, Network, CheckCircle2 } from "lucide-react";
import { DIAGRAM_ICONS, DIAGRAM_LABELS } from "@/config/diagrams";

const DIAGRAM_DESCRIPTIONS: Record<DiagramType, string> = {
  SYSTEM_ARCHITECTURE: "High-level overview of services, databases, and client boundaries.",
  DATABASE_ERD: "Relational entity diagrams mapping primary keys, foreign keys, and fields.",
  SEQUENCE: "Process interaction mapping showing request-response workflows between actors.",
  COMPONENT: "Modular system blueprints organizing internal subsystems and interfaces.",
  DEPLOYMENT: "Physical infrastructure, network, and hosting deployment topology.",
  USER_FLOW: "Step-by-step path detailing user actions and application routing paths.",
  CLASS: "Object-oriented class structures defining variables, methods, and inheritances.",
  STATE: "Finite state machine detailing lifecycle states, inputs, and transitions.",
  USE_CASE: "Functional requirements mapped as interactions between actors and cases.",
  ACTIVITY: "Control flow logic mapping sequential steps, decisions, and joins.",
};

const DIAGRAM_COLORS: Record<DiagramType, string> = {
  SYSTEM_ARCHITECTURE: "text-indigo-500",
  DATABASE_ERD: "text-emerald-500",
  SEQUENCE: "text-amber-500",
  COMPONENT: "text-purple-500",
  DEPLOYMENT: "text-pink-500",
  USER_FLOW: "text-blue-500",
  CLASS: "text-teal-500",
  STATE: "text-cyan-500",
  USE_CASE: "text-rose-500",
  ACTIVITY: "text-orange-500",
};

const ALL_DIAGRAM_TYPES = (Object.keys(DIAGRAM_LABELS) as DiagramType[]).map((type) => ({
  type,
  label: DIAGRAM_LABELS[type],
  desc: DIAGRAM_DESCRIPTIONS[type],
  iconColor: DIAGRAM_COLORS[type] || "text-muted-foreground",
}));

export const DiagramsPanel: FC<DiagramsPanelProps> = ({ ideaId }) => {
  const {
    diagrams,
    isLoading,
    isGeneratingMap,
    generationStatusMap,
    handleInitialize,
    handleRegenerateSingle,
  } = useDiagramsPage(ideaId);

  const [activeType, setActiveType] = useState<DiagramType | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [generatingType, setGeneratingType] = useState<DiagramType | null>(null);

  if (isLoading && diagrams.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If a specific diagram detail is active, render it
  if (activeType !== null) {
    return (
      <div className="flex-grow flex flex-col min-h-0 bg-background">
        <DiagramDetailView
          ideaId={ideaId}
          diagramType={activeType}
          onBack={() => setActiveType(null)}
        />
      </div>
    );
  }

  const initializedTypes = diagrams.map(d => d.type);
  const uninitializedDiags = ALL_DIAGRAM_TYPES.filter(d => !initializedTypes.includes(d.type));

  return (
    <div className="grow flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* Sticky Header */}
      <div className="shrink-0 flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Architecture Blueprints</h2>
          <p className="text-xs text-muted-foreground">
            Specify and customize your software system blueprints catalog across 10 diagram types.
          </p>
        </div>
        {uninitializedDiags.length > 0 && (
          <Button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="rounded-xl font-semibold shadow-xs bg-black text-white cursor-pointer transition-all duration-300 shrink-0"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Diagram
          </Button>
        )}
      </div>

      {/* Scrollable grid content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Add Diagram Picker Panel */}
        {showAddMenu && uninitializedDiags.length > 0 && (
          <Card className="rounded-2xl border border-indigo-500/20 bg-linear-to-b from-card to-background shadow-md overflow-hidden animate-in fade-in duration-300">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground">Add System Blueprint</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Select a diagram layout type to initialize in your workspace.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddMenu(false)} className="text-xs rounded-xl">
                Cancel
              </Button>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uninitializedDiags.map((item) => (
                  <div
                    key={item.type}
                    onClick={async () => {
                      setGeneratingType(item.type);
                      try {
                        await handleInitialize(item.type);
                        setShowAddMenu(false);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setGeneratingType(null);
                      }
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer select-none group"
                  >
                    <div className={`p-2 rounded-xl bg-background border border-border group-hover:border-indigo-500/20 shadow-xs shrink-0`}>
                      {DIAGRAM_ICONS[item.type] || <Network className="h-4.5 w-4.5" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diagrams Catalog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diagrams.map((diag) => {
            const details = ALL_DIAGRAM_TYPES.find((d) => d.type === diag.type) || {
              label: DIAGRAM_LABELS[diag.type] || `${diag.type} Diagram`,
              desc: DIAGRAM_DESCRIPTIONS[diag.type] || "System diagram",
              iconColor: "text-muted-foreground",
            };

            const isGenerating = isGeneratingMap[diag.id] || false;
            const hasCode = !!diag.mermaidCode;

            return (
              <Card
                key={diag.id}
                className="hover:border-primary/50 transition-colors cursor-pointer group relative min-h-[160px] flex flex-col justify-between"
                onClick={() => setActiveType(diag.type)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-muted/50 shrink-0`}>
                        {DIAGRAM_ICONS[diag.type] || <Network className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors pr-8">
                          {diag.title}
                        </CardTitle>
                        <CardDescription className="text-[11px] mt-0.5">
                          {details.label}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isGenerating ? (
                        <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary border-primary/20 text-[9px] uppercase tracking-wider font-semibold py-0.5 px-1.5 shrink-0">
                          Generating
                        </Badge>
                      ) : hasCode ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] uppercase tracking-wider font-semibold py-0.5 px-1.5 flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-muted/30 text-[9px] uppercase tracking-wider font-semibold py-0.5 px-1.5 shrink-0">
                          Empty
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 flex flex-col gap-2">
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                    {details.desc}
                  </p>
                  {diag.activeTier && (
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      Tier {diag.activeTier} (IR Active)
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-auto pt-1">
                    Updated {new Date(diag.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {generatingType && (
            <Card className="border-primary/20 bg-primary/5 animate-pulse min-h-[160px] flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-background shadow-xs text-primary animate-spin shrink-0">
                      <Loader2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">
                        {DIAGRAM_LABELS[generatingType] || generatingType}
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        Initializing blueprint...
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] animate-pulse">
                    Initializing
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty State */}
        {diagrams.length === 0 && !generatingType && (
          <Card className="border-dashed min-h-[220px] flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl border-border/80">
            <div className="p-3 rounded-2xl bg-muted/60 text-muted-foreground/80">
              <Network className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No blueprints initialized</h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Use the confirmation wizard or the add button above to initialize architecture blueprint diagrams.
              </p>
            </div>
            {uninitializedDiags.length > 0 && (
              <Button
                onClick={() => setShowAddMenu(true)}
                className="rounded-xl font-semibold bg-primary text-primary-foreground cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
              >
                Add Diagram Blueprint
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

