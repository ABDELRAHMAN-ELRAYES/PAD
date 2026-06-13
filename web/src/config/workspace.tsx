import React from "react";
import {
  Brain,
  FileText,
  GitBranch,
  ListChecks,
  Bot,
  Cpu,
} from "lucide-react";
import { WorkspaceSection } from "../types/workspace";

export interface SidebarItem {
  id: WorkspaceSection;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <Brain className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-primary",
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-blue-500",
  },
  {
    id: "diagrams",
    label: "Diagrams",
    icon: <GitBranch className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-violet-500",
  },
  {
    id: "features",
    label: "Features",
    icon: <ListChecks className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-green-500",
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: <Bot className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-purple-500",
  },
  {
    id: "ir",
    label: "IR Engine",
    icon: <Cpu className="h-5 w-5" />,
    color: "text-muted-foreground",
    activeColor: "text-red-500",
  },
];

export const SECTION_ITEMS: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <Brain className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-primary",
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-blue-500",
  },
  {
    id: "diagrams",
    label: "Diagrams",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-violet-500",
  },
  {
    id: "features",
    label: "Features",
    icon: <ListChecks className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-green-500",
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: <Bot className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-purple-500",
  },
  {
    id: "ir",
    label: "IR Engine",
    icon: <Cpu className="h-4 w-4" />,
    color: "text-muted-foreground",
    activeColor: "text-red-500",
  },
];
