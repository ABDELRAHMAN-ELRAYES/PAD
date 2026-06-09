"use client";

import { FC, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { MermaidBlock } from "./MermaidBlock";
import { ChatMarkdownProps } from "./ChatMarkdown.types";

export const ChatMarkdown: FC<ChatMarkdownProps> = memo(({ content, className }) => {
    return (
        <div className={`chat-markdown max-w-none wrap-break-word ${className || ""}`}>
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
                                    <pre className="p-3 bg-chat-code-bg overflow-x-auto text-xs leading-relaxed m-0 border-0 rounded-none">
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
