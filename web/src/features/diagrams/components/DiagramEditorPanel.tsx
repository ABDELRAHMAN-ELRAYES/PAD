import { FC, useState, useRef, useEffect } from "react";
import { ActivityLog, ActivityFeed } from "./ActivityFeed";
import { Code } from "lucide-react";

interface DiagramEditorPanelProps {
  code: string;
  isGenerating: boolean;
  isSaving: boolean;
  logs: ActivityLog[];
  onCodeChange: (code: string) => void;
  clearLogs: () => void;
}

export const DiagramEditorPanel: FC<DiagramEditorPanelProps> = ({
  code,
  isGenerating,
  logs,
  onCodeChange,
  clearLogs,
}) => {
  const [editorHeightPercent, setEditorHeightPercent] = useState(65);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  // Sync scrolling of textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Calculate line numbers
  const lines = code.split("\n");

  const startResize = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const startY = mouseDownEvent.clientY;
    const startHeight = editorHeightPercent;

    const doDrag = (mouseMoveEvent: MouseEvent) => {
      const deltaY = mouseMoveEvent.clientY - startY;
      const containerHeight = containerRef.current?.clientHeight || 600;
      const deltaPercent = (deltaY / containerHeight) * 100;
      setEditorHeightPercent(Math.max(25, Math.min(85, startHeight + deltaPercent)));
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-card select-none">
      {/* Upper Panel: Gutter Textarea Editor */}
      <div
        style={{ height: `${editorHeightPercent}%` }}
        className="flex flex-col min-h-0 bg-card"
      >
        <div className="h-8 bg-muted/40 border-b border-border px-3.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground font-mono flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-primary" /> Source Editor
          </span>
          {isGenerating && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-mono animate-pulse">
              STREAMING CHUNKS
            </span>
          )}
        </div>
        
        <div className="flex-grow flex min-h-0 relative">
          {/* Editor gutter line numbers */}
          <div
            ref={lineGutterRef}
            className="w-10 bg-muted/20 border-r border-border text-right pr-2 py-4 select-none font-mono text-[11px] text-muted-foreground/60 leading-6 overflow-hidden shrink-0"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Custom styled textarea */}
          <textarea
            ref={textareaRef}
            onScroll={handleScroll}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            disabled={isGenerating}
            spellCheck={false}
            className="flex-1 bg-transparent text-foreground font-mono text-[11.5px] leading-6 py-4 px-3 outline-none resize-none overflow-y-auto"
          />
        </div>
      </div>

      {/* Drag Handle Divider */}
      <div
        onMouseDown={startResize}
        className="h-1 bg-border hover:bg-primary cursor-row-resize transition-all shrink-0 z-20"
      />

      {/* Lower Panel: Activity Feed logs */}
      <div style={{ height: `${100 - editorHeightPercent}%` }} className="min-h-0 flex flex-col">
        <ActivityFeed
          logs={logs}
          isOpen={true}
          onToggle={() => {}}
          onClear={clearLogs}
          showToggle={false}
        />
      </div>
    </div>
  );
};
