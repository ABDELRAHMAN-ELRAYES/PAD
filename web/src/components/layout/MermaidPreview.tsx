"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

import { MermaidPreviewProps } from "./MermaidPreview.types";
import { initMermaid } from "@/lib/utils/mermaid";

export default function MermaidPreview({ code, onError }: MermaidPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [svgContent, setSvgContent] = useState<string>("");

    useEffect(() => {
        const renderDiagram = async () => {
            initMermaid("default");
            if (!code || !code.trim()) {
                setSvgContent("");
                setError(null);
                return;
            }

            const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            try {
                // Parse and render the diagram
                const { svg } = await mermaid.render(id, code);
                setSvgContent(svg);
                setError(null);
                if (onError) {
                    onError(null);
                }
            } catch (err) {
                console.error("Mermaid render error:", err);
                const msg = err instanceof Error ? err.message : "Failed to render diagram";
                setError(msg);
                setSvgContent("");
                if (onError) {
                    onError(msg);
                }

                // Clean up any temporary elements created by Mermaid that might have been left in the DOM
                const tempEl = document.getElementById(id);
                if (tempEl) tempEl.remove();
                const tempBindEl = document.getElementById(`d${id}`);
                if (tempBindEl) tempBindEl.remove();
            }
        };

        // Debounce rendering to avoid too many renders while typing
        const timeoutId = setTimeout(renderDiagram, 300);
        return () => clearTimeout(timeoutId);
    }, [code]);

    if (error) {
        return (
            <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md">
                <p className="font-medium mb-1">Syntax Error</p>
                <pre className="whitespace-pre-wrap text-xs opacity-80">{error}</pre>
            </div>
        );
    }

    if (!svgContent) {
        return (
            <div className="text-muted-foreground text-center py-8">
                Enter Mermaid code to see the preview
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="mermaid-preview overflow-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
    );
}
