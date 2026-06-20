import { FC, useEffect, useRef } from "react";
import { Terminal, CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

interface ActivityFeedProps {
  logs: ActivityLog[];
  isOpen: boolean;
  onToggle?: () => void;
  onClear: () => void;
  showToggle?: boolean;
}

export const ActivityFeed: FC<ActivityFeedProps> = ({
  logs,
  isOpen,
  onToggle,
  onClear,
  showToggle = true,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  const getIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />;
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />;
      default:
        return <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="bg-card text-card-foreground flex flex-col flex-grow min-h-0 border-t border-border">
      {/* Header bar */}
      <div 
        className={`flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border select-none ${showToggle && onToggle ? 'cursor-pointer' : ''}`}
        onClick={showToggle && onToggle ? onToggle : undefined}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Activity Feed & Validation Log</span>
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onClear}
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {showToggle && onToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={onToggle}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Logs area */}
      {isOpen && (
        <div className="flex-grow overflow-y-auto p-4 font-mono text-xs space-y-2.5 bg-muted/10">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/60 text-center py-8">
              No activities logged yet. Generate or edit a diagram to see validation details.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2.5 leading-relaxed items-start">
                <span className="text-muted-foreground/40 shrink-0 select-none">
                  {log.timestamp.toLocaleTimeString([], { hour12: false })}
                </span>
                {getIcon(log.type)}
                <span className={`flex-grow leading-relaxed ${
                  log.type === "error" ? "text-destructive" :
                  log.type === "warning" ? "text-warning" :
                  log.type === "success" ? "text-success" : "text-foreground"
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
