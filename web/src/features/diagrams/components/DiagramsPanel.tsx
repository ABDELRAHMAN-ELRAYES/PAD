import { FC, useState } from "react";
import { DiagramsPanelProps } from "../types/components/DiagramsPanel.types";
import { DiagramType } from "../types/models/diagrams";
import { useDiagramsPage } from "../hook/useDiagramsPage";
import { DiagramCatalogGrid } from "./DiagramCatalogGrid";
import { DiagramDetailView } from "./DiagramDetailView";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Play } from "lucide-react";

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

  if (isLoading && diagrams.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm text-muted-foreground">Loading diagrams database...</span>
      </div>
    );
  }

  // If diagrams not initialized yet, show the placeholder catalog initialization callout
  if (diagrams.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-5 border border-dashed rounded-2xl bg-card">
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="max-w-sm">
          <h3 className="text-sm font-bold text-foreground">Diagram Workspace Uninitialized</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Generate and initialize the 10-diagram architecture catalog (system architecture, ERDs, sequence diagrams) for this software idea.
          </p>
        </div>
        <Button onClick={handleInitialize} size="sm" className="h-9 px-5 font-semibold">
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Initialize Diagrams Catalog
        </Button>
      </div>
    );
  }

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

  return (
    <div className="flex-grow flex flex-col min-h-0 space-y-4">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">Architecture Catalog</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Select one of the 10 unified blueprint types to view, edit, or regenerate its contents.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DiagramCatalogGrid
          ideaId={ideaId}
          diagrams={diagrams}
          isGeneratingMap={isGeneratingMap}
          generationStatusMap={generationStatusMap}
          onSelect={(type) => setActiveType(type)}
          onGenerate={(diagram) => handleRegenerateSingle(diagram)}
        />
      </div>
    </div>
  );
};
