import React from "react";
import { Database, GitBranch, Workflow, Sparkles } from "lucide-react";
import { DiagramType } from "@/features/diagrams/types/models/diagrams";

export const DIAGRAM_ICONS: Record<DiagramType, React.ReactNode> = {
  ERD: <Database className="h-4 w-4" />,
  SEQUENCE: <GitBranch className="h-4 w-4" />,
  SCHEMA: <Workflow className="h-4 w-4" />,
  FLOWCHART: <Sparkles className="h-4 w-4" />,
};

export const DIAGRAM_LABELS: Record<DiagramType, string> = {
  ERD: "ERD",
  SEQUENCE: "Sequence",
  SCHEMA: "Architecture",
  FLOWCHART: "Flowchart",
};
