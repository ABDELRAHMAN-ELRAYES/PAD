"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HandoffPackage, HandoffProgressEvent, HandoffCompleteEvent } from "../types/models/workflow";
import { handoffApi } from "../api/workflow.api";
import { toast } from "sonner";

interface UseHandoffStreamReturn {
    isCompiling: boolean;
    progress: number;
    compileLogs: string[];
    startCompile: (ideaId: string, onComplete: () => void) => void;
    stopCompile: () => void;
}

export function useHandoffStream(): UseHandoffStreamReturn {
    const queryClient = useQueryClient();
    const [isCompiling, setIsCompiling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [compileLogs, setCompileLogs] = useState<string[]>([]);
    const esRef = useRef<EventSource | null>(null);

    const stopCompile = () => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setIsCompiling(false);
    };

    const startCompile = (ideaId: string, onComplete: () => void) => {
        if (esRef.current) {
            esRef.current.close();
        }

        setIsCompiling(true);
        setProgress(0);
        setCompileLogs([]);

        const es = handoffApi.openCompileStream(ideaId);
        esRef.current = es;

        es.addEventListener("progress", (e) => {
            const data: HandoffProgressEvent = JSON.parse(e.data);
            setProgress(data.percent);
            setCompileLogs((prev) => [...prev, `[${data.percent}%] ${data.step}`]);
        });

        es.addEventListener("log", (e) => {
            const data = JSON.parse(e.data);
            setCompileLogs((prev) => [...prev, `   → ${data.message}`]);
        });

        es.addEventListener("complete", (e) => {
            const data: HandoffCompleteEvent = JSON.parse(e.data);
            setProgress(100);
            setCompileLogs((prev) => [...prev, `✓ Package ready (v${data.version})`]);
            setIsCompiling(false);
            es.close();
            esRef.current = null;
            queryClient.invalidateQueries({ queryKey: ["handoff", "idea", ideaId] });
            toast.success("Handoff package compiled successfully!");
            onComplete();
        });

        es.addEventListener("error", (e) => {
            let msg = "Compilation failed";
            try {
                const data = JSON.parse((e as any).data || "{}");
                msg = data.message || msg;
            } catch (_) {}
            setCompileLogs((prev) => [...prev, `✗ Error: ${msg}`]);
            setIsCompiling(false);
            es.close();
            esRef.current = null;
            toast.error(msg);
        });

        es.onerror = () => {
            if (es.readyState === EventSource.CLOSED) {
                setIsCompiling(false);
            }
        };
    };

    useEffect(() => {
        return () => {
            esRef.current?.close();
        };
    }, []);

    return { isCompiling, progress, compileLogs, startCompile, stopCompile };
}
