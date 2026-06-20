"use client";

import { useState } from "react";
import { HandoffPackage, HandoffArtifact } from "../types/models/workflow";
import { HandoffFileTree } from "./HandoffFileTree";
import { HandoffPreviewCanvas } from "./HandoffPreviewCanvas";
import { HandoffSidebar } from "./HandoffSidebar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface HandoffWorkspaceProps {
    pkg: HandoffPackage;
    isCompiling: boolean;
    progress: number;
    compileLogs: string[];
    onRegenerate: () => void;
    isEmbedded?: boolean;
}

export function HandoffWorkspace({
    pkg,
    isCompiling,
    progress,
    compileLogs,
    onRegenerate,
    isEmbedded = false,
}: HandoffWorkspaceProps) {
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    const artifacts: HandoffArtifact[] = pkg.artifacts ?? [];
    const activeArtifactMeta = artifacts.find((a) => a.id === activeFileId);

    return (
        <div className={isEmbedded ? "flex flex-col h-full overflow-hidden bg-background" : "flex flex-col h-full border rounded-xl overflow-hidden bg-background"}>
            {/* 3-panel layout */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* LEFT: File Tree */}
                <div className="w-56 border-r bg-slate-950/5 dark:bg-slate-900/30 flex flex-col shrink-0">
                    <div className="px-3 py-2 border-b">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                            📦 handoff-package
                        </p>
                    </div>
                    <ScrollArea className="flex-1">
                        <HandoffFileTree
                            artifacts={artifacts}
                            activeFileId={activeFileId}
                            onFileSelect={setActiveFileId}
                        />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* CENTER: Preview */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <HandoffPreviewCanvas
                        artifactId={activeFileId}
                        artifactMeta={activeArtifactMeta}
                    />
                </div>

                {/* RIGHT: Sidebar */}
                <div className="w-52 border-l shrink-0 overflow-y-auto">
                    <HandoffSidebar
                        pkg={pkg}
                        onRegenerate={onRegenerate}
                        isCompiling={isCompiling}
                    />
                </div>
            </div>
        </div>
    );
}
