"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Cpu, Save, RefreshCw, 
  Database, GitBranch, Shield, AlertTriangle, CheckCircle, 
  HelpCircle, ChevronDown, ChevronRight, Layers
} from "lucide-react";
import { irApi } from "../api/ir.api";
import { ProjectIRSchema, ProjectIR, Entity, Relationship, Module, UserRole, BusinessRule } from "../types/ir";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

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

  // Expand/Collapse tree nodes
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entities: true,
    relationships: true,
    modules: true,
    roles: true,
    businessRules: true,
  });

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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

  // --- Mutation Functions for local tree edits ---
  const updateEntities = (updated: Entity[]) => {
    const nextSchema = { ...schema, entities: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRelationships = (updated: Relationship[]) => {
    const nextSchema = { ...schema, relationships: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateModules = (updated: Module[]) => {
    const nextSchema = { ...schema, modules: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRoles = (updated: UserRole[]) => {
    const nextSchema = { ...schema, roles: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  const updateRules = (updated: BusinessRule[]) => {
    const nextSchema = { ...schema, businessRules: updated };
    setSchema(nextSchema);
    saveSchema(nextSchema);
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 border border-border rounded-xl p-4 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Cpu className="h-5 w-5 text-primary" />
            Project Compilation Workspace
          </h2>
          <p className="text-xs text-muted-foreground">
            Unified single source of truth (IR v{ir?.version || 1}) mapping requirements to downstream assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadIR}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Facts
          </Button>
          <Button 
            size="sm" 
            onClick={handleCompile} 
            disabled={isCompiling}
            className="flex items-center gap-1 font-semibold"
          >
            {isCompiling ? <Spinner className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            Compile Assets
          </Button>
        </div>
      </div>

      {/* Warnings & Notices */}
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Compiler Warnings ({warnings.length})
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Facts Editor Workspace (Full Width) */}
      <div className="w-full">
        <Card className="border border-border">
          <CardHeader className="py-4 px-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">System Facts Registry</CardTitle>
                <CardDescription className="text-xs">Programmatic schema definitions of your application</CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">v{ir?.version || 1}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              
              {/* SECTION: ENTITIES */}
              <div className="border-b border-border">
                <button 
                  onClick={() => toggleSection("entities")}
                  className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    Data Entities ({schema.entities.length})
                  </span>
                  {expandedSections.entities ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {expandedSections.entities && (
                  <div className="px-5 pb-4 space-y-4">
                    {schema.entities.map((entity, entIdx) => (
                      <div key={entIdx} className="bg-accent/20 border border-border/80 rounded-lg p-3 relative flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <Input 
                            value={entity.name} 
                            onChange={(e) => {
                              const next = [...schema.entities];
                              next[entIdx].name = e.target.value;
                              updateEntities(next);
                            }}
                            className="h-7 w-48 font-semibold bg-background/80 text-sm"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const next = [...schema.entities];
                              next.splice(entIdx, 1);
                              updateEntities(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {/* Fields List */}
                        <div className="space-y-2 mt-2">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Fields / Attributes</div>
                          {entity.fields.map((field, fIdx) => (
                            <div key={fIdx} className="grid grid-cols-12 gap-2 items-center bg-background/50 border border-border/40 rounded p-1.5 text-xs">
                              <Input 
                                value={field.name}
                                onChange={(e) => {
                                  const next = [...schema.entities];
                                  next[entIdx].fields[fIdx].name = e.target.value;
                                  updateEntities(next);
                                }}
                                className="col-span-4 h-6 px-1.5 py-0.5 text-xs"
                                placeholder="name"
                              />
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const next = [...schema.entities];
                                  next[entIdx].fields[fIdx].type = e.target.value;
                                  updateEntities(next);
                                }}
                                className="col-span-3 h-6 px-1 border border-input rounded bg-background text-xs"
                              >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                                <option value="datetime">datetime</option>
                                <option value="text">text</option>
                              </select>
                              <div className="col-span-4 flex items-center justify-around gap-2 px-1">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!field.isPrimaryKey} 
                                    onChange={(e) => {
                                      const next = [...schema.entities];
                                      next[entIdx].fields[fIdx].isPrimaryKey = e.target.checked;
                                      updateEntities(next);
                                    }}
                                    className="scale-90"
                                  />
                                  <span className="text-[9px] font-bold text-blue-500">PK</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!field.isNullable} 
                                    onChange={(e) => {
                                      const next = [...schema.entities];
                                      next[entIdx].fields[fIdx].isNullable = e.target.checked;
                                      updateEntities(next);
                                    }}
                                    className="scale-90"
                                  />
                                  <span className="text-[9px] text-muted-foreground">Null</span>
                                </label>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="col-span-1 h-5 w-5 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const next = [...schema.entities];
                                  next[entIdx].fields.splice(fIdx, 1);
                                  updateEntities(next);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[10px] w-fit flex items-center gap-1 mt-1 bg-background/50"
                            onClick={() => {
                              const next = [...schema.entities];
                              next[entIdx].fields.push({
                                name: "new_field",
                                type: "string",
                                isNullable: true,
                              });
                              updateEntities(next);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add Field
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button 
                      onClick={() => {
                        const next = [...schema.entities];
                        next.push({
                          name: `NewEntity${next.length + 1}`,
                          fields: [{ name: "id", type: "string", isPrimaryKey: true, isNullable: false }],
                        });
                        updateEntities(next);
                      }}
                      className="w-full text-xs h-8 bg-background border border-dashed border-border hover:bg-accent/40 text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Entity Table
                    </Button>
                  </div>
                )}
              </div>

              {/* SECTION: RELATIONSHIPS */}
              <div className="border-b border-border">
                <button 
                  onClick={() => toggleSection("relationships")}
                  className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-violet-500" />
                    Entity Relationships ({schema.relationships.length})
                  </span>
                  {expandedSections.relationships ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {expandedSections.relationships && (
                  <div className="px-5 pb-4 space-y-3">
                    {schema.relationships.map((rel, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-accent/20 border border-border/80 rounded-lg p-2 text-xs">
                        <select
                          value={rel.fromEntity}
                          onChange={(e) => {
                            const next = [...schema.relationships];
                            next[idx].fromEntity = e.target.value;
                            updateRelationships(next);
                          }}
                          className="col-span-3 h-7 border rounded bg-background text-xs"
                        >
                          {schema.entities.map((e, idx) => (
                            <option key={idx} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                        
                        <select
                          value={rel.type}
                          onChange={(e) => {
                            const next = [...schema.relationships];
                            next[idx].type = e.target.value as any;
                            updateRelationships(next);
                          }}
                          className="col-span-3 h-7 border rounded bg-background text-xs"
                        >
                          <option value="one-to-one">1 : 1</option>
                          <option value="one-to-many">1 : N</option>
                          <option value="many-to-many">N : M</option>
                        </select>

                        <select
                          value={rel.toEntity}
                          onChange={(e) => {
                            const next = [...schema.relationships];
                            next[idx].toEntity = e.target.value;
                            updateRelationships(next);
                          }}
                          className="col-span-3 h-7 border rounded bg-background text-xs"
                        >
                          {schema.entities.map((e, idx) => (
                            <option key={idx} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                        
                        <Input 
                          value={rel.description || ""}
                          placeholder="e.g. references"
                          onChange={(e) => {
                            const next = [...schema.relationships];
                            next[idx].description = e.target.value;
                            updateRelationships(next);
                          }}
                          className="col-span-2 h-7 text-[11px] px-1 bg-background/50"
                        />

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="col-span-1 h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const next = [...schema.relationships];
                            next.splice(idx, 1);
                            updateRelationships(next);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button 
                      onClick={() => {
                        if (schema.entities.length < 2) {
                          toast({ title: "Operation Blocked", description: "Need at least 2 entities to create a relation.", variant: "warning" as any });
                          return;
                        }
                        const next = [...schema.relationships];
                        next.push({
                          fromEntity: schema.entities[0].name,
                          toEntity: schema.entities[1].name,
                          type: "one-to-many",
                          description: "has",
                        });
                        updateRelationships(next);
                      }}
                      className="w-full text-xs h-8 bg-background border border-dashed border-border hover:bg-accent/40 text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Relationship Link
                    </Button>
                  </div>
                )}
              </div>

              {/* SECTION: MODULES */}
              <div className="border-b border-border">
                <button 
                  onClick={() => toggleSection("modules")}
                  className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-500" />
                    Logical Modules ({schema.modules.length})
                  </span>
                  {expandedSections.modules ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {expandedSections.modules && (
                  <div className="px-5 pb-4 space-y-3">
                    {schema.modules.map((mod, idx) => (
                      <div key={idx} className="bg-accent/20 border border-border/80 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <Input 
                            value={mod.name} 
                            onChange={(e) => {
                              const next = [...schema.modules];
                              next[idx].name = e.target.value;
                              updateModules(next);
                            }}
                            className="h-7 w-48 font-semibold bg-background text-sm"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const next = [...schema.modules];
                              next.splice(idx, 1);
                              updateModules(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input 
                          value={mod.description || ""} 
                          placeholder="Module description"
                          onChange={(e) => {
                            const next = [...schema.modules];
                            next[idx].description = e.target.value;
                            updateModules(next);
                          }}
                          className="h-6 text-xs bg-background/50"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-[10px] text-muted-foreground">Depends on:</span>
                          {schema.modules.filter(m => m.name !== mod.name).map((m, mIdx) => {
                            const isDep = mod.dependencies.includes(m.name);
                            return (
                              <Badge 
                                key={mIdx} 
                                variant={isDep ? "default" : "outline"}
                                className="cursor-pointer text-[9px] h-4 px-1.5"
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
                        </div>
                      </div>
                    ))}
                    <Button 
                      onClick={() => {
                        const next = [...schema.modules];
                        next.push({
                          name: `NewModule${next.length + 1}`,
                          dependencies: [],
                          description: "",
                        });
                        updateModules(next);
                      }}
                      className="w-full text-xs h-8 bg-background border border-dashed border-border hover:bg-accent/40 text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Logical Module
                    </Button>
                  </div>
                )}
              </div>

              {/* SECTION: ROLES */}
              <div className="border-b border-border">
                <button 
                  onClick={() => toggleSection("roles")}
                  className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    User Roles & Actions ({schema.roles.length})
                  </span>
                  {expandedSections.roles ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {expandedSections.roles && (
                  <div className="px-5 pb-4 space-y-3">
                    {schema.roles.map((role, idx) => (
                      <div key={idx} className="bg-accent/20 border border-border/80 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <Input 
                            value={role.name} 
                            onChange={(e) => {
                              const next = [...schema.roles];
                              next[idx].name = e.target.value;
                              updateRoles(next);
                            }}
                            className="h-7 w-48 font-semibold bg-background text-sm"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const next = [...schema.roles];
                              next.splice(idx, 1);
                              updateRoles(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input 
                          value={role.description || ""} 
                          placeholder="Role description"
                          onChange={(e) => {
                            const next = [...schema.roles];
                            next[idx].description = e.target.value;
                            updateRoles(next);
                          }}
                          className="h-6 text-xs bg-background/50"
                        />
                        <div className="space-y-1.5 mt-2">
                          <div className="text-[10px] font-bold uppercase text-muted-foreground">Actions & Operations</div>
                          <div className="flex flex-wrap gap-1.5">
                            {role.actions.map((act, actIdx) => (
                              <Badge key={actIdx} variant="secondary" className="text-[9px] flex items-center gap-1">
                                {act}
                                <Trash2 
                                  className="h-2.5 w-2.5 text-destructive cursor-pointer" 
                                  onClick={() => {
                                    const next = [...schema.roles];
                                    next[idx].actions.splice(actIdx, 1);
                                    updateRoles(next);
                                  }}
                                />
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              placeholder="Add action (e.g. create_post)" 
                              className="h-6 text-xs px-2"
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
                        </div>
                      </div>
                    ))}
                    <Button 
                      onClick={() => {
                        const next = [...schema.roles];
                        next.push({
                          name: `NewRole${next.length + 1}`,
                          actions: ["view_dashboard"],
                          description: "",
                        });
                        updateRoles(next);
                      }}
                      className="w-full text-xs h-8 bg-background border border-dashed border-border hover:bg-accent/40 text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add User Role
                    </Button>
                  </div>
                )}
              </div>

              {/* SECTION: BUSINESS RULES */}
              <div>
                <button 
                  onClick={() => toggleSection("businessRules")}
                  className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-amber-500" />
                    Business Rules ({schema.businessRules.length})
                  </span>
                  {expandedSections.businessRules ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {expandedSections.businessRules && (
                  <div className="px-5 pb-4 space-y-3">
                    {schema.businessRules.map((rule, idx) => (
                      <div key={idx} className="bg-accent/20 border border-border/80 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <Input 
                            value={rule.title} 
                            onChange={(e) => {
                              const next = [...schema.businessRules];
                              next[idx].title = e.target.value;
                              updateRules(next);
                            }}
                            className="h-7 font-semibold bg-background text-sm"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const next = [...schema.businessRules];
                              next.splice(idx, 1);
                              updateRules(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Textarea 
                          value={rule.description} 
                          placeholder="Describe the business rules constraint..."
                          onChange={(e) => {
                            const next = [...schema.businessRules];
                            next[idx].description = e.target.value;
                            updateRules(next);
                          }}
                          className="h-14 text-xs bg-background/50"
                        />
                      </div>
                    ))}
                    <Button 
                      onClick={() => {
                        const next = [...schema.businessRules];
                        next.push({
                          title: `New Business Rule ${next.length + 1}`,
                          description: "",
                          constraints: [],
                        });
                        updateRules(next);
                      }}
                      className="w-full text-xs h-8 bg-background border border-dashed border-border hover:bg-accent/40 text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Business Constraint
                    </Button>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

  );
}
