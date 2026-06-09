"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, AlertCircle } from "lucide-react"

interface DiagramsProps {
  data: {
    architecture: string
    sequence: string
    er: string
  }
}

type DiagramType = "architecture" | "sequence" | "er"

export default function Diagrams({ data }: DiagramsProps) {
  const [activeDiagram, setActiveDiagram] = useState<DiagramType>("architecture")
  const [diagramCode, setDiagramCode] = useState(data.architecture)
  const [renderKey, setRenderKey] = useState(0)

  const diagrams = {
    architecture: { label: "Architecture Diagram", code: data.architecture },
    sequence: { label: "Sequence Diagram", code: data.sequence },
    er: { label: "ER Diagram", code: data.er },
  }

  const handleDiagramChange = (diagram: DiagramType) => {
    setActiveDiagram(diagram)
    setDiagramCode(diagrams[diagram].code)
  }

  const handleRender = () => {
    setRenderKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Mermaid Diagrams</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent bg-accent/10 px-3 py-1 rounded-full">Editable</span>
        </div>
      </div>

      <div className="flex gap-2">
        {(Object.keys(diagrams) as DiagramType[]).map((diagram) => (
          <button
            key={diagram}
            onClick={() => handleDiagramChange(diagram)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeDiagram === diagram
                ? "bg-accent text-accent-foreground"
                : "bg-secondary/20 text-foreground hover:bg-secondary/30"
            }`}
          >
            {diagrams[diagram].label}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Editor */}
        <div className="flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Editor</label>
            <Button onClick={handleRender} variant="outline" size="sm" className="gap-2 h-8 text-xs bg-transparent">
              <RotateCcw className="w-3 h-3" />
              Render
            </Button>
          </div>
          <textarea
            value={diagramCode}
            onChange={(e) => setDiagramCode(e.target.value)}
            className="flex-1 p-3 bg-card border border-border/40 rounded-lg font-mono text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent overflow-auto"
            spellCheck="false"
          />
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2 overflow-hidden">
          <label className="text-sm font-medium text-foreground">Preview</label>
          <div className="flex-1 pad-content-block overflow-auto flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Mermaid rendering requires external library</p>
              <p className="text-xs mt-1">Content preview ready for external renderer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
