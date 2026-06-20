"use client";

import { useParams } from "next/navigation";
import { DiagramDetailView } from "@/features/diagrams/components/DiagramDetailView";
import { DiagramType } from "@/features/diagrams/types/models/diagrams";

export default function StandaloneDiagramDetailRoute() {
  const params = useParams();
  const ideaId = params.id as string;
  const diagramType = params.type as DiagramType;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 flex flex-col min-w-0">
      <div className="flex-grow flex flex-col min-h-0 bg-card border rounded-2xl p-6 shadow-sm">
        <DiagramDetailView
          ideaId={ideaId}
          diagramType={diagramType}
        />
      </div>
    </div>
  );
}
