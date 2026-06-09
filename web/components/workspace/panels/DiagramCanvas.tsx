import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import MermaidPreview from "@/components/mermaid-preview";
import { DiagramCanvasProps } from "./DiagramCanvas.types";

export const DiagramCanvas: FC<DiagramCanvasProps> = ({ code }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale((s) => Math.min(s + 0.15, 3));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale((s) => Math.max(s - 0.15, 0.3));
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scroll when zooming on canvas
      const zoomFactor = 1.08;
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s * zoomFactor, 3));
      } else {
        setScale((s) => Math.max(s / zoomFactor, 0.3));
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full flex-1 min-h-[500px] overflow-hidden select-none cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-950/40"
      style={{
        backgroundImage: "radial-gradient(circle, var(--grid-color, #cbd5e1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      {/* Dynamic theme style helper variable */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --grid-color: rgba(203, 213, 225, 0.5); }
        .dark { --grid-color: rgba(51, 65, 85, 0.5); }
      `}} />
      
      {/* Zoomable & Pannable Container */}
      <div
        className="w-full h-full flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <div className="pointer-events-auto p-8">
          <MermaidPreview code={code} />
        </div>
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur border rounded-lg p-1 shadow-sm z-10 pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleReset}
          title="Reset Zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono px-2 min-w-[36px] text-center">
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
};
