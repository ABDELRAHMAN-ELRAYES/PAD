import React from "react";
import { Clock, Loader2, CheckCircle, Ban } from "lucide-react";
import { Priority, TaskStatus } from "@/features/features";

export const PRIORITY_BADGE_VARIANTS: Record<Priority, { color: string; label: string }> = {
    low: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Low" },
    medium: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Medium" },
    high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High" },
    critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
};

export const STATUS_BADGE_VARIANTS: Record<
    TaskStatus,
    { color: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
    planned: {
        color: "bg-slate-100 text-slate-700 border-slate-200",
        label: "Planned",
        icon: Clock,
    },
    in_progress: {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        label: "In Progress",
        icon: Loader2,
    },
    completed: {
        color: "bg-green-100 text-green-700 border-green-200",
        label: "Completed",
        icon: CheckCircle,
    },
    blocked: {
        color: "bg-red-100 text-red-700 border-red-200",
        label: "Blocked",
        icon: Ban,
    },
};
