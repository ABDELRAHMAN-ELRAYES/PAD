import { z } from "zod";
import { ProjectIRSchema, Module } from "../types/ir.types";

const EntityFieldSchema = z.object({
    name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    type: z.string(),
    description: z.string().optional(),
    isNullable: z.boolean().optional(),
    isPrimaryKey: z.boolean().optional(),
    isUnique: z.boolean().optional(),
});

const EntitySchema = z.object({
    name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    description: z.string().optional(),
    fields: z.array(EntityFieldSchema),
});

const RelationshipSchema = z.object({
    fromEntity: z.string(),
    toEntity: z.string(),
    type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
    description: z.string().optional(),
});

const ModuleSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    dependencies: z.array(z.string()),
});

const UserRoleSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    actions: z.array(z.string()),
});

const BusinessRuleSchema = z.object({
    title: z.string(),
    description: z.string(),
    constraints: z.array(z.string()).optional(),
});

export const ProjectIRZodSchema = z.object({
    entities: z.array(EntitySchema),
    relationships: z.array(RelationshipSchema),
    modules: z.array(ModuleSchema),
    roles: z.array(UserRoleSchema),
    businessRules: z.array(BusinessRuleSchema),
});

export interface SemanticValidationError {
    type: "ORPHAN_RELATION" | "EMPTY_ENTITY" | "DUPLICATE_NAME" | "CIRCULAR_MODULE" | "ACTIONLESS_ROLE" | "INVALID_DEPENDENCY";
    message: string;
}

export function validateSemantics(ir: ProjectIRSchema): SemanticValidationError[] {
    const errors: SemanticValidationError[] = [];
    const entityNames = new Set(ir.entities.map(e => e.name));
    const moduleNames = new Set(ir.modules.map(m => m.name));

    // 1. Orphan relationships
    for (const rel of ir.relationships) {
        if (!entityNames.has(rel.fromEntity)) {
            errors.push({
                type: "ORPHAN_RELATION",
                message: `Relationship references missing source entity: "${rel.fromEntity}"`,
            });
        }
        if (!entityNames.has(rel.toEntity)) {
            errors.push({
                type: "ORPHAN_RELATION",
                message: `Relationship references missing target entity: "${rel.toEntity}"`,
            });
        }
    }

    // 2. Empty entities
    for (const ent of ir.entities) {
        if (!ent.fields || ent.fields.length === 0) {
            errors.push({
                type: "EMPTY_ENTITY",
                message: `Entity "${ent.name}" must contain at least one field.`,
            });
        }
    }

    // 3. Duplicate names
    const seenNames = new Set<string>();
    for (const ent of ir.entities) {
        if (seenNames.has(ent.name)) {
            errors.push({
                type: "DUPLICATE_NAME",
                message: `Duplicate entity name: "${ent.name}"`,
            });
        }
        seenNames.add(ent.name);
    }

    seenNames.clear();
    for (const mod of ir.modules) {
        if (seenNames.has(mod.name)) {
            errors.push({
                type: "DUPLICATE_NAME",
                message: `Duplicate module name: "${mod.name}"`,
            });
        }
        seenNames.add(mod.name);
    }

    seenNames.clear();
    for (const role of ir.roles) {
        if (seenNames.has(role.name)) {
            errors.push({
                type: "DUPLICATE_NAME",
                message: `Duplicate role name: "${role.name}"`,
            });
        }
        seenNames.add(role.name);
    }

    // 4. Action-less roles
    for (const role of ir.roles) {
        if (!role.actions || role.actions.length === 0) {
            errors.push({
                type: "ACTIONLESS_ROLE",
                message: `User role "${role.name}" has no action list defined.`,
            });
        }
    }

    // 5. Invalid module dependencies & Cycles
    for (const mod of ir.modules) {
        for (const dep of mod.dependencies) {
            if (!moduleNames.has(dep)) {
                errors.push({
                    type: "INVALID_DEPENDENCY",
                    message: `Module "${mod.name}" references undefined dependency module: "${dep}"`,
                });
            }
        }
    }

    if (hasCycles(ir.modules)) {
        errors.push({
            type: "CIRCULAR_MODULE",
            message: "Cyclic dependency detected in module hierarchy.",
        });
    }

    return errors;
}

function hasCycles(modules: Module[]): boolean {
    const adj = new Map<string, string[]>();
    for (const m of modules) {
        adj.set(m.name, m.dependencies || []);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string): boolean {
        if (recStack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        recStack.add(node);

        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
            if (dfs(neighbor)) return true;
        }

        recStack.delete(node);
        return false;
    }

    for (const m of modules) {
        if (!visited.has(m.name)) {
            if (dfs(m.name)) return true;
        }
    }
    return false;
}
