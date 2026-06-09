import { FC, useEffect, useRef, memo } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/components/theme-provider";
import { initMermaid } from "@/lib/utils/mermaid";
import { MermaidBlockProps } from "./MermaidBlock.types";

export const MermaidBlock: FC<MermaidBlockProps> = memo(({ code }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { isDark } = useTheme();

    useEffect(() => {
        if (!containerRef.current || !code.trim()) return;
        const theme = isDark ? "dark" : "default";
        initMermaid(theme);
        
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        mermaid
            .render(id, code.trim())
            .then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            })
            .catch((err) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = `<pre class="text-xs text-red-400 p-2">Mermaid error: ${err.message || err}</pre>`;
                }
                // Clean up any temporary elements created by Mermaid that might have been left in the DOM
                const tempEl = document.getElementById(id);
                if (tempEl) tempEl.remove();
                const tempBindEl = document.getElementById(`d${id}`);
                if (tempBindEl) tempBindEl.remove();
            });
    }, [code, isDark]);

    return (
        <div
            ref={containerRef}
            className="my-3 p-3 bg-chat-code-bg rounded-lg overflow-x-auto flex justify-center [&_svg]:max-w-full"
        />
    );
});
MermaidBlock.displayName = "MermaidBlock";
