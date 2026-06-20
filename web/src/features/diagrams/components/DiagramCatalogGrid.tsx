import { FC } from "react";
import { Diagram, DiagramType } from "../types/models/diagrams";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DIAGRAM_ICONS, DIAGRAM_LABELS } from "@/config/diagrams";
import { AlertCircle, ArrowRight, Play, RefreshCw, CheckCircle2, FileEdit } from "lucide-react";

interface DiagramCatalogGridProps {
  ideaId: string;
  diagrams: Diagram[];
  isGeneratingMap: Record<string, boolean>;
  generationStatusMap?: Record<string, string>;
  onSelect: (type: DiagramType) => void;
  onGenerate: (diagram: Diagram) => void;
}

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

const getFriendlyStatus = (status: string) => {
  switch (status) {
    case "generating":
      return "Generating...";
    case "validating":
      return "Validating code...";
    case "repairing":
      return "Repairing errors...";
    case "retrying":
      return "Retrying repair...";
    default:
      return "Processing...";
  }
};

export const DiagramCatalogGrid: FC<DiagramCatalogGridProps> = ({
  ideaId,
  diagrams,
  isGeneratingMap,
  generationStatusMap = {},
  onSelect,
  onGenerate,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
      {(Object.keys(DIAGRAM_LABELS) as DiagramType[]).map((type) => {
        const diagram = diagrams.find((d) => d.type === type);
        const label = DIAGRAM_LABELS[type];
        const desc = DIAGRAM_DESCRIPTIONS[type];
        const isGenerating = diagram ? isGeneratingMap[diagram.id] : false;

        const hasCode = !!diagram?.mermaidCode;

        // Determine status display
        let statusBadge = null;
        if (isGenerating) {
          const currentStatus = diagram ? generationStatusMap[diagram.id] || "generating" : "generating";
          statusBadge = (
            <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary border-primary/20 text-[11px] px-2 py-0.5 font-medium">
              {getFriendlyStatus(currentStatus)}
            </Badge>
          );
        } else if (hasCode) {
          statusBadge = (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[11px] px-2 py-0.5 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3 text-success" />
              Ready
            </Badge>
          );
        } else {
          statusBadge = (
            <Badge variant="outline" className="text-muted-foreground border-muted/30 text-[11px] px-2 py-0.5 font-medium">
              Empty
            </Badge>
          );
        }

        return (
          <Card key={type} className="flex flex-col justify-between hover:shadow-md hover:border-accent/40 transition-all duration-200 bg-card border-border overflow-hidden group">
            <CardHeader className="space-y-1.5 pb-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-accent text-accent-foreground border border-accent/20">
                  {DIAGRAM_ICONS[type]}
                </div>
                {statusBadge}
              </div>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground pt-1.5 flex items-center gap-2">
                {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                {desc}
              </p>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              {diagram?.activeTier && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 bg-accent/40 px-2.5 py-1 border border-accent/30 rounded-md w-fit mt-2">
                  <span className="font-medium text-foreground">Compiler:</span> Tier {diagram.activeTier} (IR Active)
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-4 border-t border-border/60 bg-muted/20 flex gap-2 justify-end">
              {!hasCode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => diagram && onGenerate(diagram)}
                  disabled={isGenerating || !diagram}
                  className="h-8 text-xs font-medium border-border/80 text-foreground hover:bg-accent"
                >
                  <Play className="h-3 w-3 mr-1.5 text-primary" />
                  Generate
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => diagram && onGenerate(diagram)}
                    disabled={isGenerating || !diagram}
                    className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
                    Regen
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onSelect(type)}
                    className="h-8 text-xs font-semibold px-3"
                  >
                    <FileEdit className="h-3 w-3 mr-1.5" />
                    Open
                    <ArrowRight className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
