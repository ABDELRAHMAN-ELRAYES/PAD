"use client";

import { useState } from "react";
import { HandoffArtifact } from "../types/models/workflow";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface HandoffFileTreeProps {
    artifacts: HandoffArtifact[];
    activeFileId: string | null;
    onFileSelect: (artifactId: string) => void;
}

interface TreeNode {
    name: string;
    path: string;
    isDir: boolean;
    artifact?: HandoffArtifact;
    children: TreeNode[];
}

function buildTree(artifacts: HandoffArtifact[]): TreeNode[] {
    const root: TreeNode[] = [];

    for (const artifact of artifacts) {
        const parts = artifact.filePath.split("/");
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const path = parts.slice(0, i + 1).join("/");
            const isLast = i === parts.length - 1;

            let node = current.find((n) => n.name === name);
            if (!node) {
                node = {
                    name,
                    path,
                    isDir: !isLast,
                    artifact: isLast ? artifact : undefined,
                    children: [],
                };
                current.push(node);
            }
            current = node.children;
        }
    }

    return root;
}

function getFileIcon(fileType?: string, fileName?: string) {
    if (fileName?.startsWith(".")) return <File className="w-3.5 h-3.5 text-slate-400" />;
    if (fileType === "mermaid") return <File className="w-3.5 h-3.5 text-purple-400" />;
    if (fileType === "json") return <File className="w-3.5 h-3.5 text-yellow-400" />;
    return <File className="w-3.5 h-3.5 text-blue-400" />;
}

interface TreeNodeViewProps {
    node: TreeNode;
    depth: number;
    activeFileId: string | null;
    onFileSelect: (artifactId: string) => void;
    expanded: Record<string, boolean>;
    onToggle: (path: string) => void;
}

function TreeNodeView({ node, depth, activeFileId, onFileSelect, expanded, onToggle }: TreeNodeViewProps) {
    const isExpanded = expanded[node.path] !== false; // default expanded

    if (node.isDir) {
        return (
            <div>
                <button
                    onClick={() => onToggle(node.path)}
                    className="flex items-center gap-1.5 w-full px-2 py-1 text-left text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors"
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    ) : (
                        <ChevronRight className="w-3 h-3 shrink-0" />
                    )}
                    {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    ) : (
                        <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    )}
                    <span>{node.name}</span>
                </button>
                {isExpanded && (
                    <div>
                        {node.children.map((child) => (
                            <TreeNodeView
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                activeFileId={activeFileId}
                                onFileSelect={onFileSelect}
                                expanded={expanded}
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const isActive = node.artifact?.id === activeFileId;

    return (
        <button
            onClick={() => node.artifact && onFileSelect(node.artifact.id)}
            className={cn(
                "flex items-center gap-1.5 w-full px-2 py-1 text-left text-xs rounded transition-colors",
                isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
            <span className="w-3 shrink-0" />
            {getFileIcon(node.artifact?.fileType, node.name)}
            <span className="truncate">{node.name}</span>
        </button>
    );
}

export function HandoffFileTree({ artifacts, activeFileId, onFileSelect }: HandoffFileTreeProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const tree = buildTree(artifacts);

    const onToggle = (path: string) => {
        setExpanded((prev) => ({ ...prev, [path]: prev[path] === false ? true : false }));
    };

    return (
        <div className="py-2">
            {tree.map((node) => (
                <TreeNodeView
                    key={node.path}
                    node={node}
                    depth={0}
                    activeFileId={activeFileId}
                    onFileSelect={onFileSelect}
                    expanded={expanded}
                    onToggle={onToggle}
                />
            ))}
        </div>
    );
}
