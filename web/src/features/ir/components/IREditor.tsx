"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Cpu, Save, RefreshCw, 
  Database, GitBranch, Shield, AlertTriangle, CheckCircle, 
  HelpCircle, ChevronDown, ChevronRight, Layers,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Pencil, Check
} from "lucide-react";
import { irApi } from "../api/ir.api";
import { ProjectIRSchema, ProjectIR, Entity, Relationship, Module, UserRole, BusinessRule } from "../types/ir";
import { useIRCanvas } from "../hooks/useIRCanvas";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SQL_TYPES = [
  "VARCHAR",
  "CHAR",
  "TEXT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "BOOLEAN",
  "DECIMAL",
  "NUMERIC",
  "REAL",
  "DOUBLE PRECISION",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "JSON",
  "JSONB",
  "UUID",
  "BYTEA",
  "string",
  "number",
  "boolean",
  "datetime",
  "text"
];

interface IREditorProps {
  ideaId: string;
  idea: any;
}

export default function IREditor({ ideaId, idea }: IREditorProps) {
  const { toast } = useToast();
  const [ir, setIr] = useState<ProjectIR | null>(null);
  const [schema, setSchema] = useState<ProjectIRSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  
  // Compiler variables
  const [selectedDiagrams, setSelectedDiagrams] = useState<string[]>(["ERD", "SEQUENCE", "FLOWCHART", "ARCHITECTURE"]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // --- Canvas Management Hook ---
  const {
    scale,
    position,
    canvasRef,
    nodePositions,
    editingNodeId,
    isFullscreen,
    setNodePositions,
    setEditingNodeId,
    setIsFullscreen,
    handleMouseDown,
    handleNodeMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    getInitialNodePosition,
    getRelationshipPoints
  } = useIRCanvas(schema);

  // --- Relations UI state ---
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRelFrom, setNewRelFrom] = useState("");
  const [newRelTo, setNewRelTo] = useState("");
  const [newRelType, setNewRelType] = useState<"one-to-one" | "one-to-many" | "many-to-many">("one-to-many");
  const [newRelDesc, setNewRelDesc] = useState("");

  useEffect(() => {
    loadIR();
  }, [ideaId]);

  const loadIR = async () => {
    try {
      setIsLoading(true);
      const data = await irApi.getByIdeaId(ideaId);
      setIr(data);
      setSchema(data.schemaData);
      setWarnings([]);
    } catch (err) {
      setIr(null);
      setSchema(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInitial = async () => {
    try {
      setIsLoading(true);
      const data = await irApi.generateInitial(ideaId);
      setIr(data);
      setSchema(data.schemaData);
      toast({
        title: "IR Schema Generated",
        description: "Intermediate Representation has been compiled from user idea.",
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate IR",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Facts Mutator Helpers ---
  const saveSchema = async (updatedSchema: ProjectIRSchema) => {
    if (!schema) return;
    try {
      setIsSaving(true);
      const { updated, warnings: apiWarnings } = await irApi.update(ideaId, updatedSchema, "Tree modifications");
      setIr(updated);
      setSchema(updated.schemaData);
      setWarnings(apiWarnings || []);
      toast({
        title: "Draft Saved",
        description: "Schema draft saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save schema edits",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompile = async () => {
    try {
      setIsCompiling(true);
      await irApi.compile(ideaId, selectedDiagrams);
      
      toast({
        title: "System Compiled!",
        description: "PRD/BRD, OpenAPI specs, and selected diagrams compiled from IR.",
      });
    } catch (err: any) {
      toast({
        title: "Compilation Failed",
        description: err.message || "Failed to compile intermediate representation.",
        variant: "destructive",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRenameEntity = (entIdx: number, newName: string) => {
    if (!schema) return;
    const oldName = schema.entities[entIdx].name;
    const oldKey = `entity-${oldName}`;
    const newKey = `entity-${newName}`;
    
    setNodePositions((prev) => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });

    if (editingNodeId === oldKey) {
      setEditingNodeId(newKey);
    }

    const next = [...schema.entities];
    next[entIdx].name = newName;
    updateEntities(next);
  };

  const handleRenameModule = (idx: number, newName: string) => {
    if (!schema) return;
    const oldName = schema.modules[idx].name;
    const oldKey = `module-${oldName}`;
    const newKey = `module-${newName}`;
    
    setNodePositions((prev) => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });

    if (editingNodeId === oldKey) {
      setEditingNodeId(newKey);
    }

    const next = [...schema.modules];
    next[idx].name = newName;
    updateModules(next);
  };

  const handleRenameRole = (idx: number, newName: string) => {
    if (!schema) return;
    const oldName = schema.roles[idx].name;
    const oldKey = `role-${oldName}`;
    const newKey = `role-${newName}`;
    
    setNodePositions((prev) => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });

    if (editingNodeId === oldKey) {
      setEditingNodeId(newKey);
    }

    const next = [...schema.roles];
    next[idx].name = newName;
    updateRoles(next);
  };

  const handleRenameRule = (idx: number, newTitle: string) => {
    if (!schema) return;
    const oldTitle = schema.businessRules[idx].title;
    const oldKey = `rule-${oldTitle}`;
    const newKey = `rule-${newTitle}`;
    
    setNodePositions((prev) => {
      const next = { ...prev };
      if (next[oldKey]) {
        next[newKey] = next[oldKey];
        delete next[oldKey];
      }
      return next;
    });

    if (editingNodeId === oldKey) {
      setEditingNodeId(newKey);
    }

    const next = [...schema.businessRules];
    next[idx].title = newTitle;
    updateRules(next);
  };

  const updateEntities = (updated: Entity[]) => {
    const nextSchema = { ...schema!, entities: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRelationships = (updated: Relationship[]) => {
    const nextSchema = { ...schema!, relationships: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateModules = (updated: Module[]) => {
    const nextSchema = { ...schema!, modules: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRoles = (updated: UserRole[]) => {
    const nextSchema = { ...schema!, roles: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRules = (updated: BusinessRule[]) => {
    const nextSchema = { ...schema!, businessRules: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading compilation engine...</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-md w-full border border-border bg-card/60 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <CardTitle>Unified IR-Based Compiler</CardTitle>
            <CardDescription>
              Translate this project idea into a structured technology-agnostic facts repository first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={handleGenerateInitial} className="w-full font-medium">
              Initialize IR Schema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={isFullscreen 
      ? "fixed inset-0 z-50 bg-background w-screen h-screen overflow-hidden" 
      : "relative w-full h-full overflow-hidden border border-border rounded-xl bg-slate-50 dark:bg-zinc-950/20"
    }>
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: "radial-gradient(circle, var(--grid-color) 1.5px, transparent 1.5px)",
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${position.x}px ${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --grid-color: rgba(100, 116, 139, 0.12); }
          .dark { --grid-color: rgba(161, 161, 170, 0.08); }
        `}} />

        {/* Floating Top-Left Workspace Panels */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-3 items-start max-w-[calc(100%-32px)]">
          {/* Project Compilation Workspace Title Panel */}
          <div className={`pointer-events-auto flex justify-between items-center bg-card/45 border border-border rounded-xl backdrop-blur-md shrink-0 w-full sm:w-[420px] md:w-[480px] shadow-sm ${
            isFullscreen ? "p-4 gap-4" : "p-2.5 px-3.5 gap-3"
          }`}>
            <div className="min-w-0 flex-1">
              <h2 className={`font-semibold flex items-center gap-2 text-foreground ${
                isFullscreen ? "text-sm" : "text-xs"
              }`}>
                <Cpu className={`${isFullscreen ? "h-4 w-4" : "h-3.5 w-3.5"} text-primary shrink-0`} />
                <span className="truncate">Project Compilation Workspace</span>
              </h2>
              {isFullscreen ? (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Unified single source of truth (IR v{ir?.version || 24}) mapping requirements to downstream assets.
                </p>
              ) : (
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                  IR v{ir?.version || 24} • Unified source of truth
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCompile}
                disabled={isCompiling}
                className={`cursor-pointer justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-1.5 font-semibold shadow-xs ${
                  isFullscreen ? "px-3 text-xs h-8" : "px-2.5 text-[10px] h-7"
                }`}
              >
                {isCompiling ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <Layers className="h-3 w-3" />
                )}
                Compile Assets
              </button>
            </div>
          </div>

          {/* Canvas Actions Dock - Vertical Sidebar style */}
          <div className={`pointer-events-auto flex flex-col items-stretch bg-background border border-border shrink-0 shadow-sm rounded-lg ${
            isFullscreen ? "p-2 gap-1.5 w-48" : "p-1.5 gap-1 w-40"
          }`}>
            <button
              type="button"
              onClick={() => {
                const next = [...schema.entities];
                next.push({
                  name: `NewEntity${next.length + 1}`,
                  fields: [{ name: "id", type: "string", isPrimaryKey: true, isNullable: false }],
                });
                updateEntities(next);
              }}
              className={`cursor-pointer justify-start whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md flex items-center gap-2 ${
                isFullscreen ? "h-8 text-xs px-3" : "h-7 text-[10px] px-2.5"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Add Entity
            </button>
            <button
              type="button"
              onClick={() => {
                const next = [...schema.modules];
                next.push({
                  name: `NewModule${next.length + 1}`,
                  dependencies: [],
                  description: "",
                });
                updateModules(next);
              }}
              className={`cursor-pointer justify-start whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md flex items-center gap-2 ${
                isFullscreen ? "h-8 text-xs px-3" : "h-7 text-[10px] px-2.5"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Add Module
            </button>
            <button
              type="button"
              onClick={() => {
                const next = [...schema.roles];
                next.push({
                  name: `NewRole${next.length + 1}`,
                  actions: ["view_dashboard"],
                  description: "",
                });
                updateRoles(next);
              }}
              className={`cursor-pointer justify-start whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md flex items-center gap-2 ${
                isFullscreen ? "h-8 text-xs px-3" : "h-7 text-[10px] px-2.5"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Add User Role
            </button>
            <button
              type="button"
              onClick={() => {
                const next = [...schema.businessRules];
                next.push({
                  title: `New Business Rule ${next.length + 1}`,
                  description: "",
                  constraints: [],
                });
                updateRules(next);
              }}
              className={`cursor-pointer justify-start whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md flex items-center gap-2 ${
                isFullscreen ? "h-8 text-xs px-3" : "h-7 text-[10px] px-2.5"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Add Constraint
            </button>

            <div data-orientation="horizontal" role="none" className={`bg-border shrink-0 w-full ${
              isFullscreen ? "h-px my-1" : "h-px my-0.5"
            }`} />

            <button
              type="button"
              onClick={() => {
                if (schema.entities.length < 2) {
                  toast({ title: "Operation Blocked", description: "Need at least 2 entities to create a relation.", variant: "warning" as any });
                  return;
                }
                setNewRelFrom(schema.entities[0].name);
                setNewRelTo(schema.entities[1].name);
                setShowAddRelation(true);
              }}
              className={`cursor-pointer justify-start whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md flex items-center gap-2 ${
                isFullscreen ? "h-8 text-xs px-3" : "h-7 text-[10px] px-2.5"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5 text-violet-500" /> Relationships
            </button>
          </div>
        </div>


          {/* Pannable/Zoomable Board Content Container */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            <div className="w-[2000px] h-[1600px] relative pointer-events-auto">
              {/* SVG Connector Overlay for Relationships */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <marker 
                    id="arrow" 
                    viewBox="0 0 10 10" 
                    refX="6" 
                    refY="5" 
                    markerWidth="6" 
                    markerHeight="6" 
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" />
                  </marker>
                </defs>
                {schema.relationships.map((rel, idx) => {
                  const pts = getRelationshipPoints(rel);
                  if (!pts) return null;
                  return (
                    <path 
                      key={idx}
                      d={pts.path} 
                      fill="none" 
                      stroke="#71717a" 
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow)" 
                    />
                  );
                })}
              </svg>

              {/* HTML Overlay labels for Relationships */}
              {schema.relationships.map((rel, idx) => {
                const pts = getRelationshipPoints(rel);
                if (!pts) return null;
                return (
                  <div 
                    key={idx}
                    className="absolute bg-background/90 border border-border/80 px-2 py-0.5 rounded text-[10px] font-mono pointer-events-auto select-none nodrag flex items-center gap-1 shadow-sm"
                    style={{
                      left: pts.mx,
                      top: pts.my,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <span className="font-semibold text-muted-foreground">{rel.description || "rel"}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3 border-none bg-muted font-normal text-muted-foreground">
                      {rel.type === "one-to-many" ? "1:N" : rel.type === "many-to-many" ? "N:M" : "1:1"}
                    </Badge>
                  </div>
                );
              })}

              {/* COLUMN 1 & 2: DATA ENTITIES */}
              {schema.entities.map((entity, entIdx) => {
                const nodeId = `entity-${entity.name}`;
                const pos = nodePositions[nodeId] || getInitialNodePosition(nodeId);
                const isEditing = editingNodeId === nodeId;

                return (
                  <Card 
                    key={entIdx} 
                    className="absolute w-[320px] bg-card border border-border shadow-sm nodrag cursor-move select-none"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => handleNodeMouseDown(e, nodeId)}
                  >
                    <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between space-y-0 cursor-move">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Database className="h-4 w-4 text-zinc-500 shrink-0" />
                        {isEditing ? (
                          <Input 
                            value={entity.name} 
                            onChange={(e) => handleRenameEntity(entIdx, e.target.value)}
                            className="h-6 w-full font-bold bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                            data-interactive
                          />
                        ) : (
                          <span className="font-bold text-sm truncate text-foreground select-none">{entity.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" data-interactive>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingNodeId(isEditing ? null : nodeId)}
                        >
                          {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const next = [...schema.entities];
                            next.splice(entIdx, 1);
                            updateEntities(next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      {isEditing ? (
                        <>
                          <div className="space-y-2" data-interactive>
                            {entity.fields.map((field, fIdx) => (
                              <div key={fIdx} className="flex flex-col gap-1.5 bg-muted/20 dark:bg-zinc-900/30 border border-border/40 rounded-lg p-2 text-xs relative">
                                {/* Row 1: Field Name and Delete Button */}
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <Input 
                                    value={field.name}
                                    onChange={(e) => {
                                      const next = [...schema.entities];
                                      next[entIdx].fields[fIdx].name = e.target.value;
                                      updateEntities(next);
                                    }}
                                    className="h-7 px-2 py-0.5 text-xs bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary flex-1 font-medium"
                                    placeholder="field_name"
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={() => {
                                      const next = [...schema.entities];
                                      next[entIdx].fields.splice(fIdx, 1);
                                      updateEntities(next);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Row 2: SQL Type Select and Badges Toggles */}
                                <div className="flex items-center gap-2 w-full">
                                  {/* Native SQL Type Select */}
                                  <div className="flex-1">
                                    <select
                                      value={field.type}
                                      onChange={(e) => {
                                        const next = [...schema.entities];
                                        next[entIdx].fields[fIdx].type = e.target.value;
                                        updateEntities(next);
                                      }}
                                      className="h-7 w-full px-2 text-xs border border-border/80 rounded bg-background text-foreground focus-visible:ring-1 focus-visible:ring-primary cursor-pointer font-sans"
                                    >
                                      {SQL_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Constraint Toggles */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      title="Primary Key"
                                      onClick={() => {
                                        const next = [...schema.entities];
                                        next[entIdx].fields[fIdx].isPrimaryKey = !field.isPrimaryKey;
                                        updateEntities(next);
                                      }}
                                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                                        field.isPrimaryKey
                                          ? "bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-sm"
                                          : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      PK
                                    </button>

                                    <button
                                      type="button"
                                      title="Nullable"
                                      onClick={() => {
                                        const next = [...schema.entities];
                                        next[entIdx].fields[fIdx].isNullable = !field.isNullable;
                                        updateEntities(next);
                                      }}
                                      className={`px-2 py-1 rounded text-[9px] font-medium transition-all border ${
                                        field.isNullable
                                          ? "bg-zinc-500/10 border-zinc-500/30 text-zinc-400 dark:text-zinc-500 shadow-sm"
                                          : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      NULL
                                    </button>

                                    <button
                                      type="button"
                                      title="Foreign Key"
                                      onClick={() => {
                                        const next = [...schema.entities];
                                        const nextField = next[entIdx].fields[fIdx];
                                        const wasFk = !!nextField.isForeignKey;
                                        nextField.isForeignKey = !wasFk;
                                        if (!wasFk) {
                                          const otherEntities = schema.entities.filter(e => e.name !== entity.name);
                                          if (otherEntities.length > 0) {
                                            nextField.referencesEntity = otherEntities[0].name;
                                            if (otherEntities[0].fields.length > 0) {
                                              nextField.referencesField = otherEntities[0].fields[0].name;
                                            }
                                          } else {
                                            nextField.referencesEntity = entity.name;
                                            if (entity.fields.length > 0) {
                                              nextField.referencesField = entity.fields[0].name;
                                            }
                                          }
                                        } else {
                                          delete nextField.referencesEntity;
                                          delete nextField.referencesField;
                                        }
                                        updateEntities(next);
                                      }}
                                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                                        field.isForeignKey
                                          ? "bg-violet-500/10 border-violet-500/30 text-violet-500 shadow-sm"
                                          : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      FK
                                    </button>
                                  </div>
                                </div>

                                {/* Row 3: FK References Selector (Native HTML select) */}
                                {field.isForeignKey && (
                                  <div className="pt-2 border-t border-border/30 grid grid-cols-2 gap-2" data-interactive>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">References Entity</span>
                                      <select
                                        value={field.referencesEntity || ""}
                                        onChange={(e) => {
                                          const next = [...schema.entities];
                                          const nextField = next[entIdx].fields[fIdx];
                                          nextField.referencesEntity = e.target.value;
                                          const targetEnt = schema.entities.find(ent => ent.name === e.target.value);
                                          if (targetEnt && targetEnt.fields.length > 0) {
                                            const pkField = targetEnt.fields.find(f => f.isPrimaryKey) || targetEnt.fields[0];
                                            nextField.referencesField = pkField.name;
                                          }
                                          updateEntities(next);
                                        }}
                                        className="h-7 w-full px-1.5 text-[10px] border border-border/80 rounded bg-background text-foreground focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                                      >
                                        {schema.entities.map((e, eIdx) => (
                                          <option key={eIdx} value={e.name}>
                                            {e.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">References Field</span>
                                      <select
                                        value={field.referencesField || ""}
                                        onChange={(e) => {
                                          const next = [...schema.entities];
                                          next[entIdx].fields[fIdx].referencesField = e.target.value;
                                          updateEntities(next);
                                        }}
                                        className="h-7 w-full px-1.5 text-[10px] border border-border/80 rounded bg-background text-foreground focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                                      >
                                        {(schema.entities.find(ent => ent.name === field.referencesEntity)?.fields || []).map((f, colIdx) => (
                                          <option key={colIdx} value={f.name}>
                                            {f.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[10px] w-full flex items-center justify-center gap-1 bg-background"
                            onClick={() => {
                              const next = [...schema.entities];
                              next[entIdx].fields.push({
                                name: `new_col_${next[entIdx].fields.length + 1}`,
                                type: "VARCHAR",
                                isNullable: true,
                              });
                              updateEntities(next);
                            }}
                            data-interactive
                          >
                            <Plus className="h-3 w-3" /> Add Field
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-1 mt-1 text-xs">
                          {entity.fields.map((field, fIdx) => (
                            <div key={fIdx} className="flex items-center justify-between border-b border-border/10 py-1">
                              <span className="font-semibold text-foreground select-text">{field.name}</span>
                              <div className="flex items-center gap-1.5 font-mono text-[10px] select-none">
                                <span className="text-muted-foreground">{field.type}</span>
                                {field.isPrimaryKey && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-500/30 text-blue-500 font-bold bg-blue-500/5">
                                    PK
                                  </Badge>
                                )}
                                {field.isForeignKey && field.referencesEntity && field.referencesField && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-violet-500/30 text-violet-500 font-bold bg-violet-500/5 cursor-help" title={`References ${field.referencesEntity}.${field.referencesField}`}>
                                    FK → {field.referencesEntity}.{field.referencesField}
                                  </Badge>
                                )}
                                {field.isNullable && (
                                  <span className="text-[9px] text-muted-foreground">null</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {entity.fields.length === 0 && (
                            <span className="text-[10px] text-muted-foreground italic select-none">No fields defined</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* COLUMN 3: LOGICAL MODULES */}
              {schema.modules.map((mod, idx) => {
                const nodeId = `module-${mod.name}`;
                const pos = nodePositions[nodeId] || getInitialNodePosition(nodeId);
                const isEditing = editingNodeId === nodeId;

                return (
                  <Card 
                    key={idx} 
                    className="absolute w-[300px] bg-card border border-border shadow-sm nodrag cursor-move select-none"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => handleNodeMouseDown(e, nodeId)}
                  >
                    <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between space-y-0 cursor-move">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Cpu className="h-4 w-4 text-zinc-500 shrink-0" />
                        {isEditing ? (
                          <Input 
                            value={mod.name} 
                            onChange={(e) => handleRenameModule(idx, e.target.value)}
                            className="h-6 w-full font-bold bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                            data-interactive
                          />
                        ) : (
                          <span className="font-bold text-sm truncate text-foreground select-none">{mod.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" data-interactive>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingNodeId(isEditing ? null : nodeId)}
                        >
                          {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const next = [...schema.modules];
                            next.splice(idx, 1);
                            updateModules(next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2" data-interactive>
                          <Input 
                            value={mod.description || ""} 
                            placeholder="Module description"
                            onChange={(e) => {
                              const next = [...schema.modules];
                              next[idx].description = e.target.value;
                              updateModules(next);
                            }}
                            className="h-7 text-xs bg-background"
                          />
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground">Dependencies</span>
                            <div className="flex flex-wrap gap-1 border border-dashed rounded p-1 bg-muted/20">
                              {schema.modules.filter(m => m.name !== mod.name).map((m, mIdx) => {
                                const isDep = mod.dependencies.includes(m.name);
                                return (
                                  <Badge 
                                    key={mIdx} 
                                    variant={isDep ? "default" : "outline"}
                                    className="cursor-pointer text-[9px] h-4 px-1.5 select-none"
                                    onClick={() => {
                                      const next = [...schema.modules];
                                      if (isDep) {
                                        next[idx].dependencies = next[idx].dependencies.filter(d => d !== m.name);
                                      } else {
                                        next[idx].dependencies.push(m.name);
                                      }
                                      updateModules(next);
                                    }}
                                  >
                                    {m.name}
                                  </Badge>
                                );
                              })}
                              {schema.modules.filter(m => m.name !== mod.name).length === 0 && (
                                <span className="text-[9px] text-muted-foreground italic">No other modules</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs select-text">
                          <p className="text-muted-foreground leading-relaxed italic">{mod.description || "No description provided"}</p>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground select-none">Depends on:</span>
                            <div className="flex flex-wrap gap-1">
                              {mod.dependencies.map((dep, depIdx) => (
                                <Badge key={depIdx} variant="secondary" className="text-[9px] select-none">
                                  {dep}
                                </Badge>
                              ))}
                              {mod.dependencies.length === 0 && (
                                <span className="text-[10px] text-muted-foreground italic select-none">No dependencies</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* COLUMN 4: USER ROLES */}
              {schema.roles.map((role, idx) => {
                const nodeId = `role-${role.name}`;
                const pos = nodePositions[nodeId] || getInitialNodePosition(nodeId);
                const isEditing = editingNodeId === nodeId;

                return (
                  <Card 
                    key={idx} 
                    className="absolute w-[300px] bg-card border border-border shadow-sm nodrag cursor-move select-none"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => handleNodeMouseDown(e, nodeId)}
                  >
                    <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between space-y-0 cursor-move">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Shield className="h-4 w-4 text-zinc-500 shrink-0" />
                        {isEditing ? (
                          <Input 
                            value={role.name} 
                            onChange={(e) => handleRenameRole(idx, e.target.value)}
                            className="h-6 w-full font-bold bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                            data-interactive
                          />
                        ) : (
                          <span className="font-bold text-sm truncate text-foreground select-none">{role.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" data-interactive>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingNodeId(isEditing ? null : nodeId)}
                        >
                          {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const next = [...schema.roles];
                            next.splice(idx, 1);
                            updateRoles(next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      {isEditing ? (
                        <div className="space-y-3" data-interactive>
                          <Input 
                            value={role.description || ""} 
                            placeholder="Role description"
                            onChange={(e) => {
                              const next = [...schema.roles];
                              next[idx].description = e.target.value;
                              updateRoles(next);
                            }}
                            className="h-7 text-xs bg-background"
                          />
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground">Operations / Permissions</span>
                            <div className="flex flex-wrap gap-1 border border-dashed rounded p-1.5 bg-muted/20">
                              {role.actions.map((act, actIdx) => (
                                <Badge key={actIdx} variant="secondary" className="text-[9px] flex items-center gap-1 select-none">
                                  {act}
                                  <Trash2 
                                    className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive cursor-pointer" 
                                    onClick={() => {
                                      const next = [...schema.roles];
                                      next[idx].actions.splice(actIdx, 1);
                                      updateRoles(next);
                                    }}
                                  />
                                </Badge>
                              ))}
                              {role.actions.length === 0 && (
                                <span className="text-[9px] text-muted-foreground italic">No operations</span>
                              )}
                            </div>
                          </div>
                          <Input 
                            placeholder="Add action + Enter" 
                            className="h-7 text-xs px-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                const next = [...schema.roles];
                                next[idx].actions.push(e.currentTarget.value.trim());
                                updateRoles(next);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs select-text">
                          <p className="text-muted-foreground italic leading-relaxed">{role.description || "No description provided"}</p>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground select-none">Allowed Actions:</span>
                            <div className="flex flex-wrap gap-1">
                              {role.actions.map((act, actIdx) => (
                                <Badge key={actIdx} variant="secondary" className="text-[9px] select-none">
                                  {act}
                                </Badge>
                              ))}
                              {role.actions.length === 0 && (
                                <span className="text-[10px] text-muted-foreground italic select-none">No operations allowed</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* COLUMN 5: BUSINESS RULES */}
              {schema.businessRules.map((rule, idx) => {
                const nodeId = `rule-${rule.title}`;
                const pos = nodePositions[nodeId] || getInitialNodePosition(nodeId);
                const isEditing = editingNodeId === nodeId;

                return (
                  <Card 
                    key={idx} 
                    className="absolute w-[300px] bg-card border border-border shadow-sm nodrag cursor-move select-none"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => handleNodeMouseDown(e, nodeId)}
                  >
                    <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between space-y-0 cursor-move">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CheckCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                        {isEditing ? (
                          <Input 
                            value={rule.title} 
                            onChange={(e) => handleRenameRule(idx, e.target.value)}
                            className="h-6 w-full font-bold bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                            data-interactive
                          />
                        ) : (
                          <span className="font-bold text-sm truncate text-foreground select-none">{rule.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" data-interactive>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingNodeId(isEditing ? null : nodeId)}
                        >
                          {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const next = [...schema.businessRules];
                            next.splice(idx, 1);
                            updateRules(next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 select-text">
                      {isEditing ? (
                        <Textarea 
                          value={rule.description} 
                          placeholder="Describe constraints..."
                          onChange={(e) => {
                            const next = [...schema.businessRules];
                            next[idx].description = e.target.value;
                            updateRules(next);
                          }}
                          className="min-h-[100px] text-xs bg-background resize-none leading-relaxed"
                          data-interactive
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {rule.description || "No rule descriptions defined"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Floating Canvas controls */}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              title="Reset View"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <span className="text-[10px] text-muted-foreground font-mono px-2 min-w-[36px] text-center select-none">
              {Math.round(scale * 100)}%
            </span>
          </div>
          {/* Floating Bottom-Left Panels (Warnings and Relationships Modal) */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col-reverse gap-3 items-start max-h-[calc(100%-120px)]">
            {showAddRelation && (
              <Card className="pointer-events-auto w-80 bg-background/95 backdrop-blur border border-border shadow-lg flex flex-col max-h-[500px] overflow-hidden">
                <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
                  <CardTitle className="text-xs font-bold flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5 text-violet-500" /> Entity Relationships
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAddRelation(false)}
                  >
                    Close
                  </Button>
                </CardHeader>
                <CardContent className="p-3 flex-1 flex flex-col gap-3 min-h-0">
                  {/* Create form toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="text-[11px] font-semibold flex items-center justify-center gap-1 w-full py-1.5 border border-dashed rounded border-border hover:bg-accent text-foreground transition-all shrink-0"
                  >
                    {showCreateForm ? "Hide Form" : "+ Add New Relationship"}
                  </button>

                  {/* Create form */}
                  {showCreateForm && (
                    <div className="space-y-2 border border-border/60 bg-muted/20 rounded-lg p-2.5 shrink-0 text-xs transition-all">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">New Link</div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Source Table</span>
                        <select
                          value={newRelFrom}
                          onChange={(e) => setNewRelFrom(e.target.value)}
                          className="w-full h-8 text-xs border rounded bg-background px-2"
                        >
                          {schema.entities.map((e, idx) => (
                            <option key={idx} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Relationship Type</span>
                        <select
                          value={newRelType}
                          onChange={(e) => setNewRelType(e.target.value as any)}
                          className="w-full h-8 text-xs border rounded bg-background px-2"
                        >
                          <option value="one-to-one">1 : 1 (One to One)</option>
                          <option value="one-to-many">1 : N (One to Many)</option>
                          <option value="many-to-many">N : M (Many to Many)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Target Table</span>
                        <select
                          value={newRelTo}
                          onChange={(e) => setNewRelTo(e.target.value)}
                          className="w-full h-8 text-xs border rounded bg-background px-2"
                        >
                          {schema.entities.map((e, idx) => (
                            <option key={idx} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Label / Description</span>
                        <Input 
                          value={newRelDesc}
                          placeholder="e.g. owns, references"
                          onChange={(e) => setNewRelDesc(e.target.value)}
                          className="h-8 text-xs px-2"
                        />
                      </div>

                      <Button 
                        onClick={() => {
                          if (!newRelFrom || !newRelTo) return;
                          const next = [...schema.relationships];
                          next.push({
                            fromEntity: newRelFrom,
                            toEntity: newRelTo,
                            type: newRelType,
                            description: newRelDesc.trim() || "references",
                          });
                          updateRelationships(next);
                          setNewRelDesc("");
                          setShowCreateForm(false);
                          toast({
                            title: "Relationship Added",
                            description: `Link established between ${newRelFrom} and ${newRelTo}.`,
                          });
                        }}
                        className="w-full h-8 text-xs"
                      >
                        Create Relationship Link
                      </Button>
                    </div>
                  )}

                  {/* List active */}
                  <div className="flex flex-col flex-1 min-h-0 gap-1.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground shrink-0">
                      Active Links ({schema.relationships.length})
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                      {schema.relationships.map((rel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/40 border border-border/80 rounded p-1.5 text-xs">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-semibold text-foreground truncate">{rel.fromEntity} → {rel.toEntity}</span>
                            <span className="text-[10px] text-muted-foreground italic truncate">
                              {rel.type} {rel.description ? `(${rel.description})` : ""}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => {
                              const next = [...schema.relationships];
                              next.splice(idx, 1);
                              updateRelationships(next);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {schema.relationships.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic block pt-1">
                          No active relationships
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Floating Warnings Overlay */}
            {warnings.length > 0 && (
              <div className="pointer-events-auto max-w-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-2.5 text-[10px] flex flex-col gap-1.5 shadow-md backdrop-blur-md dark:bg-amber-950/20">
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Warnings ({warnings.length})
                </div>
                <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
