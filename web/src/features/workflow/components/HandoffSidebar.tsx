"use client";

import { HandoffPackage } from "../types/models/workflow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, RefreshCw, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { handoffApi } from "../api/workflow.api";
import { useGetMasterPrompt } from "../api/workflowQueries";
import { toast } from "sonner";

interface HandoffSidebarProps {
    pkg: HandoffPackage;
    onRegenerate: () => void;
    isCompiling: boolean;
}

const statusConfig = {
    ready: { label: "Ready", icon: CheckCircle2, color: "text-green-500", badgeClass: "bg-green-500/10 text-green-600 border-green-500/30" },
    generating: { label: "Generating", icon: Clock, color: "text-amber-500", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    failed: { label: "Failed", icon: AlertCircle, color: "text-red-500", badgeClass: "bg-red-500/10 text-red-600 border-red-500/30" },
    draft: { label: "Draft", icon: Package, color: "text-slate-500", badgeClass: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
};

export function HandoffSidebar({ pkg, onRegenerate, isCompiling }: HandoffSidebarProps) {
    const masterPromptMutation = useGetMasterPrompt();

    const config = statusConfig[pkg.status] ?? statusConfig.draft;
    const StatusIcon = config.icon;

    const artifactCount = pkg.artifacts?.length ?? 0;

    const handleDownload = () => {
        handoffApi.downloadZip(pkg.id);
    };

    const handleCopyPrompt = async () => {
        masterPromptMutation.mutate(pkg.id, {
            onSuccess: async (prompt) => {
                await navigator.clipboard.writeText(prompt);
                toast.success("Master prompt copied to clipboard!");
            },
        });
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Package Overview */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Package Overview
                </h3>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Version</span>
                        <span className="font-mono font-semibold text-xs">v{pkg.version}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Artifacts</span>
                        <span className="font-mono font-semibold text-xs">{artifactCount} files</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Status</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${config.color}`} />
                            {config.label}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Generated</span>
                        <span className="text-xs">
                            {new Date(pkg.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px bg-border" />

            {/* Actions */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                </h3>

                <Button
                    onClick={handleDownload}
                    disabled={pkg.status !== "ready"}
                    className="w-full gap-2 justify-start"
                    size="sm"
                >
                    <Download className="w-4 h-4" />
                    Download ZIP Bundle
                </Button>

                <Button
                    variant="outline"
                    onClick={handleCopyPrompt}
                    disabled={pkg.status !== "ready" || masterPromptMutation.isPending}
                    className="w-full gap-2 justify-start"
                    size="sm"
                >
                    <Copy className="w-4 h-4" />
                    {masterPromptMutation.isPending ? "Copying..." : "Copy Master Prompt"}
                </Button>

                <Button
                    variant="ghost"
                    onClick={onRegenerate}
                    disabled={isCompiling}
                    className="w-full gap-2 justify-start text-muted-foreground"
                    size="sm"
                >
                    <RefreshCw className={`w-4 h-4 ${isCompiling ? "animate-spin" : ""}`} />
                    Regenerate Package
                </Button>
            </div>

            <div className="h-px bg-border" />

            {/* Tips */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Usage Tips
                </h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">1.</span>
                        Download ZIP and open in Cursor or Windsurf
                    </li>
                    <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">2.</span>
                        Or copy the Master Prompt and paste into any AI chat
                    </li>
                    <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">3.</span>
                        Start with <code className="bg-muted px-1 rounded">AI_IDE_START_HERE.md</code>
                    </li>
                </ul>
            </div>
        </div>
    );
}
