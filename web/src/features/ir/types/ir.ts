
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
  dependencies: string[];
}

export interface UserRole {
  name: string;
  description?: string;
  actions: string[];
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

export interface ProjectIR {
  id: string;
  ideaId: string;
  version: number;
  schemaData: ProjectIRSchema;
  createdAt: string;
  updatedAt: string;
  versions?: {
    id: string;
    version: number;
    schemaData: ProjectIRSchema;
    changelog?: string;
    createdAt: string;
  }[];
}

interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}