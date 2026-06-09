import { Badge } from "@/components/ui/badge";
import { PriorityBadgeProps } from "../types/components/PriorityBadge.types";
import { PRIORITY_BADGE_VARIANTS } from "@/config/badges";

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
    const variant = PRIORITY_BADGE_VARIANTS[priority];

    return (
        <Badge
            className={`${variant.color} border ${className || ""}`}
            variant="outline"
        >
            {variant.label}
        </Badge>
    );
}
