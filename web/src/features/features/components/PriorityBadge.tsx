import { Badge } from "@/components/ui/badge";
import { PriorityBadgeProps } from "../types/components/PriorityBadge.types";
import { PRIORITY_BADGE_VARIANTS } from "@/config/badges";

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
    const key = (priority || "low").toLowerCase();
    const variant = (PRIORITY_BADGE_VARIANTS as Record<string, any>)[key] || PRIORITY_BADGE_VARIANTS.low;

    return (
        <Badge
            className={`${variant.color} border ${className || ""}`}
            variant="outline"
        >
            {variant.label}
        </Badge>
    );
}
