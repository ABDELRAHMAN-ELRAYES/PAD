"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Terminal, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface HandoffProgressLogProps {
    logs: string[];
    progress: number;
    isCompiling: boolean;
}

export function HandoffProgressLog({ logs, progress, isCompiling }: HandoffProgressLogProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="border-t bg-slate-950 text-slate-100">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-mono text-slate-400 font-semibold">COMPILER OUTPUT</span>
                {isCompiling ? (
                    <div className="ml-auto flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-mono">RUNNING</span>
                    </div>
                ) : progress === 100 ? (
                    <div className="ml-auto flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400 font-mono">DONE</span>
                    </div>
                ) : null}
            </div>

            {(isCompiling || progress > 0) && (
                <div className="px-4 py-2 flex items-center gap-3 border-b border-slate-800">
                    <Progress value={progress} className="flex-1 h-1.5 bg-slate-800" />
                    <span className="text-xs font-mono text-slate-400 w-10 text-right">{progress}%</span>
                </div>
            )}

            <ScrollArea className="h-32">
                <div className="px-4 py-2 space-y-0.5">
                    {logs.length === 0 && (
                        <p className="text-xs font-mono text-slate-600 italic">Waiting for compiler...</p>
                    )}
                    {logs.map((log, i) => (
                        <p key={i} className="text-xs font-mono text-slate-300 leading-relaxed">
                            {log}
                        </p>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>
        </div>
    );
}
