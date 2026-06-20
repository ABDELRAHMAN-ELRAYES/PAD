"use client";

import { useParams, useRouter } from "next/navigation";
import { useDiagramsPage } from "@/features/diagrams/hook/useDiagramsPage";
import { DiagramCatalogGrid } from "@/features/diagrams/components/DiagramCatalogGrid";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Play, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function StandaloneDiagramsPage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const {
    diagrams,
    isLoading,
    isGeneratingMap,
    handleInitialize,
    handleRegenerateSingle,
  } = useDiagramsPage(ideaId);

  if (isLoading && diagrams.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm text-muted-foreground">Loading diagrams database...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6">
      {/* Header breadcrumb */}
      <div className="shrink-0 flex flex-col gap-1">
        <Link
          href={`/ideas/${ideaId}`}
          className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Back to Idea Board
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
          Architecture Design Suite
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          Specify your software structure across 10 functional blueprints. View components, edit raw Mermaid syntax, and export vectorized architecture.
        </p>
      </div>

      {diagrams.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-5 border border-dashed rounded-2xl bg-card max-w-2xl mx-auto mt-8">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-sm font-bold text-foreground">Workspace Uninitialized</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              No diagrams generated for this idea. Click below to initialize and compile the 10-diagram suite.
            </p>
          </div>
          <Button onClick={() => handleInitialize()} className="h-9 px-6 font-semibold">
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Initialize Catalog Suite
          </Button>
        </div>
      ) : (
        <DiagramCatalogGrid
          ideaId={ideaId}
          diagrams={diagrams}
          isGeneratingMap={isGeneratingMap}
          onSelect={(type) => router.push(`/ideas/${ideaId}/diagrams/${type}`)}
          onGenerate={(diagram) => handleRegenerateSingle(diagram)}
          onAdd={handleInitialize}
        />
      )}
    </div>
  );
}
