-- 000013_create_diagram_versions_table.up.sql
CREATE TABLE IF NOT EXISTS diagram_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    version INT NOT NULL,
    mermaid_code TEXT NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_diagram_versions_diag_ver UNIQUE (diagram_id, version)
);

CREATE INDEX IF NOT EXISTS idx_diagram_versions_diag_id ON diagram_versions(diagram_id);
