import { Badge } from "@/components/ui/badge";
import { PriorityBadgeProps } from "./PriorityBadge.types";
import { PRIORITY_BADGE_VARIANTS } from "@/lib/constants/badges";

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
