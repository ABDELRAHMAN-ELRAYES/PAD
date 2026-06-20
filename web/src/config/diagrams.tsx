import React from "react";
import {
  Network,
  Database,
  ArrowRightLeft,
  Cpu,
  Layers,
  GitBranch,
  FileCode,
  Compass,
  Settings,
  Activity,
} from "lucide-react";
import { DiagramType } from "@/features/diagrams/types/models/diagrams";

export const DIAGRAM_ICONS: Record<DiagramType, React.ReactNode> = {
  SYSTEM_ARCHITECTURE: <Network className="h-4 w-4" />,
  DATABASE_ERD: <Database className="h-4 w-4" />,
  SEQUENCE: <ArrowRightLeft className="h-4 w-4" />,
  COMPONENT: <Cpu className="h-4 w-4" />,
  DEPLOYMENT: <Layers className="h-4 w-4" />,
  USER_FLOW: <GitBranch className="h-4 w-4" />,
  CLASS: <FileCode className="h-4 w-4" />,
  STATE: <Compass className="h-4 w-4" />,
  USE_CASE: <Settings className="h-4 w-4" />,
  ACTIVITY: <Activity className="h-4 w-4" />,
};

export const DIAGRAM_LABELS: Record<DiagramType, string> = {
  SYSTEM_ARCHITECTURE: "System Architecture",
  DATABASE_ERD: "Database ERD",
  SEQUENCE: "Sequence Diagram",
  COMPONENT: "Component Diagram",
  DEPLOYMENT: "Deployment Diagram",
  USER_FLOW: "User Flow Diagram",
  CLASS: "Class Diagram",
  STATE: "State Diagram",
  USE_CASE: "Use Case Diagram",
  ACTIVITY: "Activity Diagram",
};
