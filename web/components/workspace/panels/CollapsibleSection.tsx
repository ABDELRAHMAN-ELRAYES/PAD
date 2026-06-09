import { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CollapsibleSectionProps } from "./CollapsibleSection.types";

export const CollapsibleSection: FC<CollapsibleSectionProps> = ({
  title,
  icon,
  color,
  isOpen,
  onToggle,
  count,
  children,
}) => (
  <div className="border rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <span className={color}>{icon}</span>
      <span className={`text-sm font-medium ${color}`}>{title}</span>
      <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
        {count}
      </Badge>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
    {isOpen && <div className="px-4 pb-4">{children}</div>}
  </div>
);
