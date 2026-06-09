"use client";

import { FC } from "react";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { SIDEBAR_ITEMS, SidebarItem } from "@/config/workspace";
import { WorkspaceSidebarProps } from "../types/components/WorkspaceSidebar.types";

export const WorkspaceSidebar: FC<WorkspaceSidebarProps> = ({
    activeSection,
    onSectionChange,
    ideaStatus,
}) => {
    return (
        <div className="workspace-sidebar flex flex-col items-center py-4 gap-1 border-r border-border bg-sidebar w-14 shrink-0">
            {SIDEBAR_ITEMS.map((item: SidebarItem) => {
                const isActive = activeSection === item.id;
                const isDisabled =
                    ideaStatus !== "confirmed" &&
                    item.id !== "overview";

                return (
                    <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() =>
                                    !isDisabled && onSectionChange(item.id)
                                }
                                disabled={isDisabled}
                                className={cn(
                                    "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                                    isActive
                                        ? `${item.activeColor} bg-accent`
                                        : `${item.color} hover:bg-accent/50 hover:text-foreground`,
                                    isDisabled &&
                                        "opacity-30 cursor-not-allowed hover:bg-transparent"
                                )}
                                aria-label={item.label}
                            >
                                {item.icon}
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-current" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            <p>{item.label}</p>
                            {isDisabled && (
                                <p className="text-[10px] opacity-70">
                                    Confirm idea first
                                </p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
};
