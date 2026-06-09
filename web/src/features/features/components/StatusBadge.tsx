import { Badge } from "@/components/ui/badge";
import { StatusBadgeProps } from "../types/components/StatusBadge.types";
import { STATUS_BADGE_VARIANTS } from "@/config/badges";

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variant = STATUS_BADGE_VARIANTS[status];
    const Icon = variant.icon;

    return (
        <Badge
            className={`${variant.color} border ${className || ""}`}
            variant="outline"
        >
            <Icon className="w-3 h-3 mr-1" />
            {variant.label}
        </Badge>
    );
}
