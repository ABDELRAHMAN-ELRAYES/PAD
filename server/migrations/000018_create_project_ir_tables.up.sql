-- 000018_create_project_ir_tables.up.sql
CREATE TABLE IF NOT EXISTS project_ir (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    schema_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_ir_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_ir_id UUID NOT NULL REFERENCES project_ir(id) ON DELETE CASCADE,
    version INT NOT NULL,
    schema_data JSONB NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_ir_ver UNIQUE (project_ir_id, version)
);

CREATE INDEX IF NOT EXISTS idx_project_ir_idea_id ON project_ir(idea_id);
CREATE INDEX IF NOT EXISTS idx_project_ir_versions_ir_id ON project_ir_versions(project_ir_id);
