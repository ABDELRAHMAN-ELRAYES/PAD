"use client";

import { FC, useEffect, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import mermaid from "mermaid";
import { useTheme } from "@/components/theme-provider";

let mermaidInitialized = false;
let currentMermaidTheme = "default";

function initMermaid(theme: string) {
    if (mermaidInitialized && currentMermaidTheme === theme) return;
    mermaid.initialize({
        startOnLoad: false,
        theme: theme as any,
        securityLevel: "loose",
        suppressErrorRendering: true,
    });
    mermaidInitialized = true;
    currentMermaidTheme = theme;
}

/** Renders a mermaid code block as an SVG diagram. */
const MermaidBlock: FC<{ code: string }> = memo(({ code }) => {
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

interface ChatMarkdownProps {
    content: string;
    className?: string;
}

export const ChatMarkdown: FC<ChatMarkdownProps> = memo(({ content, className }) => {
    return (
        <div className={`chat-markdown max-w-none break-words ${className || ""}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    code: ({ className: codeClassName, children, ...props }) => {
                        const match = /language-(\w+)/.exec(codeClassName || "");
                        const lang = match?.[1];
                        const codeStr = String(children).replace(/\n$/, "");

                        // Mermaid block
                        if (lang === "mermaid") {
                            return <MermaidBlock code={codeStr} />;
                        }

                        // Fenced code block
                        if (lang || codeStr.includes("\n")) {
                            return (
                                <div className="my-2 rounded-lg overflow-hidden border border-border/40">
                                    {lang && (
                                        <div className="flex items-center justify-between px-3 py-1 bg-muted/50 text-[10px] text-muted-foreground uppercase tracking-wider">
                                            <span>{lang}</span>
                                        </div>
                                    )}
                                    <pre className="p-3 bg-chat-code-bg overflow-x-auto text-xs leading-relaxed !m-0 !border-0 !rounded-none">
                                        <code className={codeClassName} {...props}>{children}</code>
                                    </pre>
                                </div>
                            );
                        }

                        // Inline code is handled by .chat-markdown globals.css
                        return (
                            <code className={codeClassName} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
ChatMarkdown.displayName = "ChatMarkdown";
