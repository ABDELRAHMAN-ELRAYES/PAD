"use client";

import { FC, useEffect, useState } from "react";
import { documentApi } from "../api/documents.api";
import { Document, DocumentType } from "../types/models/documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Sparkles, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

import { DocumentsPanelProps } from "../types/components/DocumentsPanel.types";

const ALL_DOCUMENT_TYPES: { type: DocumentType; label: string; desc: string; iconColor: string }[] = [
  { type: "BRD", label: "Business Requirements Document (BRD)", desc: "Core business goals and targets", iconColor: "text-emerald-500" },
  { type: "PRD", label: "Product Requirements Document (PRD)", desc: "Functional specifications and user stories", iconColor: "text-blue-500" },
  { type: "SRS", label: "Software Requirements Specification (SRS)", desc: "Technical system specifications", iconColor: "text-indigo-500" },
  { type: "FRS", label: "Functional Requirements Specification (FRS)", desc: "Detailed behavioral and validation rules", iconColor: "text-amber-500" },
  { type: "SYSTEM_ARCH", label: "System Architecture Document (SAD)", desc: "High-level modular architecture blueprint", iconColor: "text-purple-500" },
  { type: "API_SPEC", label: "API Specification (API Spec)", desc: "Endpoint definitions and integration contracts", iconColor: "text-pink-500" },
  { type: "TEST_PLAN", label: "QA & Test Plan", desc: "Strategy and validation test cases", iconColor: "text-teal-500" },
  { type: "USER_MANUAL", label: "User Guide & Manual", desc: "End-user guide and product documentation", iconColor: "text-cyan-500" },
  { type: "SECURITY_PLAN", label: "Security & Compliance Plan", desc: "Threat modeling and policy audit", iconColor: "text-rose-500" }
];

export const DocumentsPanel: FC<DocumentsPanelProps> = ({ ideaId, idea }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<DocumentType | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [autoStream, setAutoStream] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [ideaId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentApi.getByIdeaId(ideaId);
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: DocumentType) => {
    try {
      setGeneratingType(type);
      const doc = await documentApi.createPlaceholder(ideaId, type);
      setAutoStream(true);
      setOpenDocId(doc.id);
      toast.success(`${type} document initialized!`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to generate ${type}`,
      );
    } finally {
      setGeneratingType(null);
      setShowAddMenu(false);
    }
  };

  const handleDelete = async (docId: string, type: DocumentType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the ${type} document? This will permanently delete all its version history.`)) {
      return;
    }
    try {
      await documentApi.delete(docId);
      toast.success(`${type} deleted successfully`);
      fetchDocuments();
    } catch (err) {
      toast.error(`Failed to delete ${type}`);
    }
  };

  // If a document is open, show the detail panel
  if (openDocId) {
    return (
      <DocumentDetailPanel
        docId={openDocId}
        ideaId={ideaId}
        autoStream={autoStream}
        onBack={() => {
          setOpenDocId(null);
          setAutoStream(false);
          fetchDocuments();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initializedTypes = documents.map(d => d.type);
  const uninitializedDocs = ALL_DOCUMENT_TYPES.filter(d => !initializedTypes.includes(d.type));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Requirements Specifications</h2>
          <p className="text-xs text-muted-foreground">
            Generate and manage detailed specifications blueprints for your project.
          </p>
        </div>
        {idea.status === "confirmed" && uninitializedDocs.length > 0 && (
          <Button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="rounded-xl font-semibold shadow-xs bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white cursor-pointer transition-all duration-300"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Specification
          </Button>
        )}
      </div>

      {/* Add Document Picker Panel */}
      {showAddMenu && uninitializedDocs.length > 0 && (
        <Card className="rounded-2xl border border-indigo-500/20 bg-linear-to-b from-card to-background shadow-md overflow-hidden animate-in fade-in duration-300">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground">Add Document Specification</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Select a document specification type to initialize and generate.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddMenu(false)} className="text-xs rounded-xl">
              Cancel
            </Button>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uninitializedDocs.map((item) => (
                <div
                  key={item.type}
                  onClick={() => handleGenerate(item.type)}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer select-none group"
                >
                  <div className={`p-2 rounded-xl bg-background border border-border group-hover:border-indigo-500/20 shadow-xs shrink-0 ${item.iconColor}`}>
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const details = ALL_DOCUMENT_TYPES.find((d) => d.type === doc.type) || {
            label: `${doc.type} Specification`,
            desc: "Custom project specification",
            iconColor: "text-muted-foreground",
          };
          return (
            <Card
              key={doc.id}
              className="hover:border-primary/50 transition-colors cursor-pointer group relative min-h-[160px] flex flex-col justify-between"
              onClick={() => {
                setAutoStream(false);
                setOpenDocId(doc.id);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-muted/50 shrink-0 ${details.iconColor}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors pr-8">
                        {doc.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        {details.label}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant={doc.status === "published" ? "default" : "secondary"}
                      className="text-[9px] uppercase tracking-wider font-semibold py-0.5 px-1.5"
                    >
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
                      onClick={(e) => handleDelete(doc.id, doc.type, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-[10px] text-muted-foreground">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {generatingType && (
          <Card className="border-primary/20 bg-primary/5 animate-pulse min-h-[160px] flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-background shadow-xs text-primary animate-spin shrink-0">
                    <Loader2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">
                      {ALL_DOCUMENT_TYPES.find((d) => d.type === generatingType)?.label || generatingType}
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      Initializing document...
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] animate-pulse">
                  Initializing
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {documents.length === 0 && !generatingType && (
        <Card className="border-dashed min-h-[220px] flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl border-border/80">
          <div className="p-3 rounded-2xl bg-muted/60 text-muted-foreground/80">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No specification documents initialized</h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Use the confirmation wizard or the add button above to initialize specification documents.
            </p>
          </div>
          {idea.status === "confirmed" && uninitializedDocs.length > 0 && (
            <Button
              onClick={() => setShowAddMenu(true)}
              className="rounded-xl font-semibold bg-primary text-primary-foreground cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
            >
              Add Specification
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};
