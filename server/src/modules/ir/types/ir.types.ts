export interface EntityField {
    name: string;
    type: string;
    description?: string;
    isNullable?: boolean;
    isPrimaryKey?: boolean;
    isUnique?: boolean;
    isForeignKey?: boolean;
    referencesEntity?: string;
    referencesField?: string;
}

export interface Entity {
    name: string;
    description?: string;
    fields: EntityField[];
}

export interface Relationship {
    fromEntity: string;
    toEntity: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
    description?: string;
}

export interface Module {
    name: string;
    description?: string;
    dependencies: string[]; // references other module names
}

export interface UserRole {
    name: string;
    description?: string;
    actions: string[]; // actions this role performs
}

export interface BusinessRule {
    title: string;
    description: string;
    constraints?: string[];
}

export interface ProjectIRSchema {
    entities: Entity[];
    relationships: Relationship[];
    modules: Module[];
    roles: UserRole[];
    businessRules: BusinessRule[];
}
