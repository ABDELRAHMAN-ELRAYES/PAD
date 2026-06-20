import { FC } from "react";
import { Diagram, DiagramType } from "../types/models/diagrams";
import { cn } from "@/lib/utils";
import {
    Network,
    Database,
    ArrowRightLeft,
    Layers,
    Cpu,
    GitBranch,
    FileCode,
    RefreshCw,
    Circle,
    Activity,
    Compass,
    Settings,
} from "lucide-react";

interface DiagramCatalogProps {
    diagrams: Diagram[];
    activeType: DiagramType;
    onSelectType: (type: DiagramType) => void;
    isGeneratingMap: Record<string, boolean>;
}

interface CatalogItem {
    type: DiagramType;
    label: string;
    description: string;
    icon: any;
}

const STRUCTURAL_ITEMS: CatalogItem[] = [
    {
        type: "SYSTEM_ARCHITECTURE",
        label: "System Architecture",
        description: "Services, databases, API gateways, clusters",
        icon: Network,
    },
    {
        type: "DATABASE_ERD",
        label: "Database ERD",
        description: "Entity relationships, keys, columns",
        icon: Database,
    },
    {
        type: "COMPONENT",
        label: "Component Diagram",
        description: "Logical code structures & interfaces",
        icon: Cpu,
    },
    {
        type: "DEPLOYMENT",
        label: "Deployment Diagram",
        description: "VPCs, containers, server hosting setup",
        icon: Layers,
    },
    {
        type: "CLASS",
        label: "Class Diagram",
        description: "OO structure, methods, attributes",
        icon: FileCode,
    },
];

const BEHAVIORAL_ITEMS: CatalogItem[] = [
    {
        type: "SEQUENCE",
        label: "Sequence Diagram",
        description: "Trace interaction messages between parts",
        icon: ArrowRightLeft,
    },
    {
        type: "USER_FLOW",
        label: "User Flow Diagram",
        description: "UX routing, screen paths, decisions",
        icon: GitBranch,
    },
    {
        type: "STATE",
        label: "State Diagram",
        description: "State transition & entity lifecycle",
        icon: Compass,
    },
    {
        type: "USE_CASE",
        label: "Use Case Diagram",
        description: "Actor interactions and functions",
        icon: Settings,
    },
    {
        type: "ACTIVITY",
        label: "Activity Diagram",
        description: "Parallel flowcharts and actions",
        icon: Activity,
    },
];

export const DiagramCatalog: FC<DiagramCatalogProps> = ({
    diagrams,
    activeType,
    onSelectType,
    isGeneratingMap,
}) => {
    const getDiagramStatus = (type: DiagramType) => {
        const d = diagrams.find((diag) => diag.type === type);
        const isGenerating = d ? isGeneratingMap[d.id] : false;
        
        if (isGenerating) return "generating";
        if (!d || !d.mermaidCode || d.mermaidCode.trim() === "") return "empty";
        return d.status || "draft";
    };

    const renderItem = (item: CatalogItem) => {
        const Icon = item.icon;
        const status = getDiagramStatus(item.type);
        const isActive = activeType === item.type;
        const d = diagrams.find((diag) => diag.type === item.type);

        return (
            <button
                key={item.type}
                onClick={() => onSelectType(item.type)}
                className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-200 flex items-start gap-3 border group relative overflow-hidden",
                    isActive
                        ? "bg-slate-900 border-sky-500/40 text-slate-100 shadow-md"
                        : "bg-slate-950/20 border-slate-900/60 hover:bg-slate-900/40 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                )}
            >
                {/* Visual active indicator border glow */}
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
                )}

                <div className={cn(
                    "p-2 rounded-lg border shrink-0 mt-0.5 transition-colors",
                    isActive 
                        ? "bg-sky-500/10 border-sky-500/25 text-sky-400" 
                        : "bg-slate-900 border-slate-800/65 text-slate-500 group-hover:text-slate-400 group-hover:border-slate-800"
                )}>
                    <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold truncate leading-tight">
                            {item.label}
                        </span>
                        
                        {/* Status badge/dot */}
                        {status === "generating" ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-sky-400 shrink-0" />
                        ) : status === "empty" ? (
                            <span className="text-[9px] bg-slate-900/80 border text-slate-500 px-1.5 py-0.5 rounded-full shrink-0 font-semibold font-mono">
                                empty
                            </span>
                        ) : (
                            <span className={cn(
                                "text-[9px] border px-1.5 py-0.5 rounded-full shrink-0 font-semibold font-mono",
                                status === "published" 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            )}>
                                {status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 leading-snug">
                        {item.description}
                    </p>
                </div>
            </button>
        );
    };

    return (
        <aside className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0 min-h-0 select-none">
            {/* Catalog header */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Diagram Catalog
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                    10 types of software modeling views
                </p>
            </div>

            {/* Catalog lists */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 font-mono">
                        Structural Views
                    </h4>
                    <div className="space-y-2">
                        {STRUCTURAL_ITEMS.map(renderItem)}
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 font-mono">
                        Behavioral / Process Views
                    </h4>
                    <div className="space-y-2">
                        {BEHAVIORAL_ITEMS.map(renderItem)}
                    </div>
                </div>
            </div>
        </aside>
    );
};
