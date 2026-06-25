import { FC, useState, useEffect, useRef } from "react";
import { DiagramType } from "../types/models/diagrams";
import { useDiagramsPage } from "../hook/useDiagramsPage";
import { useDiagramVersions } from "../api/diagramsQueries";
import { DiagramCanvas } from "./DiagramCanvas";
import { DiagramEditorPanel } from "./DiagramEditorPanel";
import { ImportExportDialog } from "./ImportExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Upload,
  Eye,
  Code as CodeIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit,
  History,
  X,
  Download,
  FileText,
  FileCode,
  Image as ImageIcon,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [showHistory, setShowHistory] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerWidth, setHeaderWidth] = useState(700);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderWidth(entry.contentRect.width);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

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
      <div className="grow flex flex-col items-center justify-center p-8 bg-card border rounded-2xl text-center">
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

  // Load versions
  const { data: versionsData } = useDiagramVersions(diagram.id);
  const versions = versionsData || [];

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

  const handleCancelEdit = () => {
    handleCodeChange(diagram.id, diagram.mermaidCode);
    handleTitleChange(diagram.id, diagram.title);
    setActiveTab("preview");
  };

  const handleSaveAndReturn = async () => {
    await handleSave(diagram);
    setActiveTab("preview");
  };

  // Export handlers
  const handleExportMMD = () => {
    const blob = new Blob([diagram.mermaidCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.mmd`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Mermaid source code exported");
  };

  const handleExportSVG = () => {
    const svgEl = window.document.querySelector(".mermaid-preview svg");
    if (!svgEl) {
      toast.error("Diagram preview not rendered yet. Please wait.");
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SVG diagram exported");
  };

  const handleExportPNG = () => {
    const svgEl = window.document.querySelector(".mermaid-preview svg") as SVGElement;
    if (!svgEl) {
      toast.error("Diagram preview not rendered yet. Please wait.");
      return;
    }

    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = window.document.createElement("canvas");
        const rect = svgEl.getBoundingClientRect();
        canvas.width = (rect.width || 800) * 2;
        canvas.height = (rect.height || 600) * 2;
        const context = canvas.getContext("2d");

        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const png = canvas.toDataURL("image/png");
          const link = window.document.createElement("a");
          link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.png`;
          link.href = png;
          link.click();
          toast.success("PNG image exported");
        } else {
          toast.error("Failed to acquire 2D canvas context");
        }
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        toast.error("Failed to render diagram image");
        URL.revokeObjectURL(url);
      };
      image.src = url;
    } catch (err) {
      console.error("Export PNG failed", err);
      toast.error("Failed to export PNG");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-300">
      {/* Top Bar Header */}
      <div ref={headerRef} className="flex items-center justify-between border-b px-6 py-3 shrink-0 bg-background">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {onBack ? (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Link href={`/ideas/${ideaId}/diagrams`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div className="flex-1 max-w-xl min-w-0">
            <Input
              value={currentTitle}
              onChange={(e) => handleTitleChange(diagram.id, e.target.value)}
              readOnly={activeTab !== "code"}
              className={cn(
                "bg-transparent text-lg font-bold p-0 h-auto focus-visible:ring-0 shadow-none focus:outline-none w-full truncate text-foreground transition-all duration-200 pb-0.5",
                activeTab === "code"
                  ? "border-b border-border/80 cursor-text"
                  : "border-none cursor-default select-none pointer-events-none"
              )}
              placeholder="Diagram Title"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isGenerating && (
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 animate-pulse text-[10px] font-semibold shrink-0">
              <Loader2 className="mr-1 h-3 w-3 animate-spin shrink-0" />
              {getFriendlyStatus(generationStatusMap[diagram.id] || "generating")}
            </Badge>
          )}
          <Badge variant="outline" className="mr-1 capitalize text-[10px] font-semibold shrink-0">
            {diagram.type.toLowerCase().replace(/_/g, " ")}
          </Badge>

          {/* Compiled multi-tier selector */}
          {activeTab === "preview" && diagram.tier1Code && (
            <div className="flex items-center bg-muted border rounded-lg p-0.5 mr-1 shrink-0">
              <button
                onClick={() => handleTierSelect(diagram, 1)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold rounded-md transition-all",
                  diagram.activeTier === 1
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T1
              </button>
              <button
                onClick={() => handleTierSelect(diagram, 2)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold rounded-md transition-all",
                  diagram.activeTier === 2
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T2
              </button>
              <button
                onClick={() => handleTierSelect(diagram, 3)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold rounded-md transition-all",
                  diagram.activeTier === 3
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                T3
              </button>
            </div>
          )}

          {/* View Mode Actions */}
          {activeTab === "preview" && (
            headerWidth >= 650 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  className="h-8 text-xs gap-1.5 hover:bg-muted/60"
                >
                  <History className="h-3.5 w-3.5" />
                  History ({versions.length})
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 hover:bg-muted/60">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPNG} className="cursor-pointer">
                      <ImageIcon className="h-4 w-4 mr-2 text-indigo-500" />
                      PNG Image (.png)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportSVG} className="cursor-pointer">
                      <FileCode className="h-4 w-4 mr-2 text-sky-500" />
                      SVG Vector (.svg)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportMMD} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2 text-emerald-500" />
                      Mermaid Code (.mmd)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateSingle(diagram)}
                  disabled={isGenerating}
                  className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted/50 cursor-pointer"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
                  Regenerate
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted/50 cursor-pointer">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowHistory(true)} className="cursor-pointer">
                    <History className="h-4 w-4 mr-2 text-muted-foreground" />
                    Version History ({versions.length})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportPNG} className="cursor-pointer">
                    <ImageIcon className="h-4 w-4 mr-2 text-indigo-500" />
                    Export PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportSVG} className="cursor-pointer">
                    <FileCode className="h-4 w-4 mr-2 text-sky-500" />
                    Export SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportMMD} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2 text-emerald-500" />
                    Export Mermaid MMD
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleRegenerateSingle(diagram)} disabled={isGenerating} className="cursor-pointer">
                    <RefreshCw className={cn("h-4 w-4 mr-2 text-muted-foreground", isGenerating && "animate-spin")} />
                    Regenerate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}

          {/* Edit Mode Actions */}
          {activeTab === "code" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 text-xs gap-1.5 hover:bg-muted/60 cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportOpen(true)}
                disabled={isGenerating}
                className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted/50 cursor-pointer shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndReturn}
                disabled={!hasChanges || saving}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shrink-0"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <Save className="h-3.5 w-3.5 shrink-0" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setActiveTab("code")}
              disabled={isGenerating}
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shrink-0"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Blueprint</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-background">
        {isPlaceholder && !isGenerating ? (
          <div className="grow flex flex-col items-center justify-center border border-dashed border-border p-12 text-center gap-4 bg-muted/10 min-h-[300px]">
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
          <div className="flex-1 overflow-hidden relative">
            <DiagramCanvas code={currentCode} diagram={diagram} onError={setLocalRenderError} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <DiagramEditorPanel
              code={currentCode}
              isGenerating={isGenerating}
              isSaving={saving}
              logs={logs}
              onCodeChange={(code) => handleCodeChange(diagram.id, code)}
              clearLogs={clearLogs}
            />
          </div>
        )}
      </div>

      {/* Import paste dialog */}
      <ImportExportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        diagram={diagram}
        onImport={(code) => handleImport(diagram, code)}
      />

      {/* Version History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent className="w-[400px] sm:w-[540px] custom-scrollbar overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              View snapshot history of this architecture diagram. Versions are created automatically when saving changes or regenerating.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {versions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No version history yet
              </p>
            ) : (
              (() => {
                const currentVersion = versions[0]?.version || 0;
                return versions.map((ver) => (
                  <Card key={ver.id} className="relative group overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">v{ver.version}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ver.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {ver.version === currentVersion && (
                          <Badge variant="default" className="bg-green-500 text-[10px] border-none text-white hover:bg-green-600">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold mb-1 leading-relaxed text-foreground/90">
                        {ver.changelog || "No changelog provided"}
                      </p>
                      <div className="mt-3 border-t pt-2 border-border/30 text-[10px] text-muted-foreground">
                        {ver.mermaidCode.length} characters of Mermaid syntax
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

