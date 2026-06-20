import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ZoomIn, ZoomOut, Maximize2, Download, ImageIcon, FileCode, FileText, Printer } from "lucide-react";
import MermaidPreview from "@/components/layout/MermaidPreview";
import { DiagramCanvasProps } from "../types/components/DiagramCanvas.types";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const DiagramCanvas: FC<DiagramCanvasProps> = ({ code, diagram, onError }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Left click with Ctrl/Space or just standard left click dragging
    if (e.button !== 0) return;
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

  // Export raw Mermaid (.mmd)
  const handleExportMMD = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.mmd`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Mermaid source code exported");
  };

  // Export SVG
  const handleExportSVG = () => {
    const svgEl = canvasRef.current?.querySelector("svg");
    if (!svgEl) {
      toast.error("Diagram preview not rendered yet. Please wait.");
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SVG diagram exported");
  };

  // Export high-resolution PNG
  const handleExportPNG = () => {
    const svgEl = canvasRef.current?.querySelector("svg") as SVGElement | null;
    if (!svgEl) {
      toast.error("Diagram preview not rendered yet. Please wait.");
      return;
    }

    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const rect = svgEl.getBoundingClientRect();
        // 2.5x resolution scaling
        canvas.width = (rect.width || 800) * 2.5;
        canvas.height = (rect.height || 600) * 2.5;
        const context = canvas.getContext("2d");

        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const png = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.png`;
          link.href = png;
          link.click();
          toast.success("PNG image exported");
        } else {
          toast.error("Failed to acquire 2D canvas context");
        }
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        toast.error("Failed to render diagram image");
        URL.revokeObjectURL(url);
      };
      image.src = url;
    } catch (err) {
      console.error("Export PNG failed", err);
      toast.error("Failed to export PNG");
    }
  };

  // Export PDF via browser print window
  const handleExportPDF = () => {
    const svgEl = canvasRef.current?.querySelector("svg");
    if (!svgEl) {
      toast.error("Diagram preview not rendered yet. Please wait.");
      return;
    }

    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked! Please allow popups to export PDF.");
        return;
      }
      printWindow.document.write(`
        <html>
        <head>
          <title>${diagram.title}</title>
          <style>
            body {
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background: white;
            }
            svg {
              max-width: 100%;
              max-height: 100%;
            }
            @media print {
              body {
                width: 100%;
                height: 100%;
              }
            }
          </style>
        </head>
        <body>
          ${svgString}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("PDF print stream prepared");
    } catch (err) {
      console.error("Export PDF failed", err);
      toast.error("Failed to export PDF");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      // Delta-based zoom control
      e.preventDefault();
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
      className="relative w-full h-full flex-grow overflow-hidden select-none cursor-grab active:cursor-grabbing rounded-none border-none bg-card"
      style={{
        backgroundImage: "radial-gradient(circle, var(--grid-color, rgba(148, 163, 184, 0.15)) 1px, transparent 1px)",
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${position.x}px ${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        :root { --grid-color: rgba(148, 163, 184, 0.12); }
        .dark { --grid-color: rgba(51, 65, 85, 0.2); }
      `}} />

      {/* Zoomable & Pannable Container */}
      <div
        className="w-full h-full flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <div className="pointer-events-auto p-12">
          <MermaidPreview code={code} onError={onError} />
        </div>
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-lg p-1 shadow-sm z-10 pointer-events-auto">
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
          title="Reset Zoom & Pan"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono px-2 min-w-[36px] text-center">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Floating Canvas Export Controls */}
      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 bg-background/95 backdrop-blur gap-1.5 shadow-sm text-xs font-medium">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem onClick={handleExportPNG} className="gap-2 cursor-pointer text-xs">
              <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
              PNG Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSVG} className="gap-2 cursor-pointer text-xs">
              <FileCode className="h-3.5 w-3.5 text-sky-500" />
              SVG Vector
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer text-xs">
              <Printer className="h-3.5 w-3.5 text-rose-500" />
              PDF Vector
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportMMD} className="gap-2 cursor-pointer text-xs">
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              Mermaid Code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
