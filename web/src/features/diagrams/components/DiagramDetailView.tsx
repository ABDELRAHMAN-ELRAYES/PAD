import { FC, useState, useEffect } from "react";
import { Diagram, DiagramType } from "../types/models/diagrams";
import { useDiagramsPage } from "../hook/useDiagramsPage";
import { DiagramCanvas } from "./DiagramCanvas";
import { DiagramEditorPanel } from "./DiagramEditorPanel";
import { ImportExportDialog } from "./ImportExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Save, RefreshCw, Upload, Eye, Code as CodeIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DiagramDetailViewProps {
  ideaId: string;
  diagramType: DiagramType;
  onBack?: () => void;
}

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

export const DiagramDetailView: FC<DiagramDetailViewProps> = ({
  ideaId,
  diagramType,
  onBack,
}) => {
  const {
    diagrams,
    isLoading,
    isGeneratingMap,
    generationStatusMap,
    isSaving,
    logs,
    editedCode,
    editedTitles,
    streamingCode,
    handleSave,
    handleRegenerateSingle,
    handleImport,
    handleTierSelect,
    handleCodeChange,
    handleTitleChange,
    clearLogs,
  } = useDiagramsPage(ideaId);

  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [localRenderError, setLocalRenderError] = useState<string | null>(null);

  useEffect(() => {
    setLocalRenderError(null);
  }, [diagramType]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm text-muted-foreground">Loading diagram workspace...</span>
      </div>
    );
  }

  const diagram = diagrams.find((d) => d.type === diagramType);

  if (!diagram) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-card border rounded-2xl text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-base font-bold text-foreground">Diagram Not Found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          The requested diagram catalog configuration could not be loaded.
        </p>
        {onBack ? (
          <Button onClick={onBack} variant="outline" size="sm" className="mt-4">
            Back to Catalog
          </Button>
        ) : (
          <Link href={`/ideas/${ideaId}/diagrams`} className="mt-4">
            <Button variant="outline" size="sm">Back to Catalog</Button>
          </Link>
        )}
      </div>
    );
  }

  const isGenerating = isGeneratingMap[diagram.id] || false;
  const saving = isSaving[diagram.id] || false;
  const currentCode = isGenerating
    ? streamingCode[diagram.id] || ""
    : editedCode[diagram.id] !== undefined
    ? editedCode[diagram.id]
    : diagram.mermaidCode;

  const currentTitle = editedTitles[diagram.id] !== undefined
    ? editedTitles[diagram.id]
    : diagram.title;

  const hasChanges =
    (editedCode[diagram.id] !== undefined && editedCode[diagram.id] !== diagram.mermaidCode) ||
    (editedTitles[diagram.id] !== undefined && editedTitles[diagram.id] !== diagram.title);

  const isPlaceholder = !currentCode || currentCode.trim() === "";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background space-y-4">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Back to Catalog"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={`/ideas/${ideaId}/diagrams`}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Back to Catalog"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <div className="min-w-0 flex-grow flex items-center gap-2">
            <Input
              value={currentTitle}
              onChange={(e) => handleTitleChange(diagram.id, e.target.value)}
              placeholder="Diagram Title"
              disabled={isGenerating}
              className="bg-transparent border-transparent hover:border-border focus-visible:ring-1 focus-visible:ring-ring text-base font-bold text-foreground h-9 px-2 rounded-lg max-w-[240px] truncate"
            />
            {isGenerating ? (
              <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0.5 font-medium shrink-0">
                {getFriendlyStatus(generationStatusMap[diagram.id] || "generating")}
              </Badge>
            ) : !isPlaceholder ? (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium shrink-0">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-muted/30 text-[10px] px-2 py-0.5 font-medium shrink-0">
                Empty
              </Badge>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Compiled multi-tier selector */}
          {diagram.tier1Code && (
            <div className="flex items-center bg-muted border rounded-lg p-0.5 mr-1 shrink-0">
              <button
                onClick={() => handleTierSelect(diagram, 1)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                  diagram.activeTier === 1
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T1 (High)
              </button>
              <button
                onClick={() => handleTierSelect(diagram, 2)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                  diagram.activeTier === 2
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T2 (Detail)
              </button>
              <button
                onClick={() => handleTierSelect(diagram, 3)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                  diagram.activeTier === 3
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T3 (Impl)
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            disabled={isGenerating}
            className="h-8 border-border hover:bg-muted text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Import
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerateSingle(diagram)}
            disabled={isGenerating}
            className="h-8 border-border hover:bg-muted text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(diagram)}
            disabled={saving || isGenerating || !hasChanges}
            className="h-8 text-xs font-semibold px-4"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Sub-header Tab selectors */}
      <div className="flex items-center justify-between border-b border-border pb-px shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5",
              activeTab === "preview"
                ? "border-primary text-primary font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5",
              activeTab === "code"
                ? "border-primary text-primary font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <CodeIcon className="h-3.5 w-3.5" />
            Source Code
          </button>
        </div>
      </div>

      {/* Workspace Display Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {isPlaceholder && !isGenerating ? (
          <div className="flex-grow flex flex-col items-center justify-center border border-dashed border-border rounded-2xl p-12 text-center gap-4 bg-muted/10 min-h-[300px]">
            <div className="p-3.5 rounded-full bg-muted border border-border text-muted-foreground">
              <CodeIcon className="h-8 w-8" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-bold text-foreground">Empty Diagram Code</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This diagram is empty. Request the AI to generate the diagram or import a Mermaid code snippet manually.
              </p>
            </div>
            <Button
              onClick={() => handleRegenerateSingle(diagram)}
              size="sm"
              className="mt-2 text-xs font-semibold px-5"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Generate Now
            </Button>
          </div>
        ) : activeTab === "preview" ? (
          <DiagramCanvas code={currentCode} diagram={diagram} onError={setLocalRenderError} />
        ) : (
          <DiagramEditorPanel
            code={currentCode}
            isGenerating={isGenerating}
            isSaving={saving}
            logs={logs}
            onCodeChange={(code) => handleCodeChange(diagram.id, code)}
            clearLogs={clearLogs}
          />
        )}
      </div>

      {/* Import / Paste Modal */}
      <ImportExportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        diagram={diagram}
        onImport={(code) => handleImport(diagram, code)}
      />
    </div>
  );
};
