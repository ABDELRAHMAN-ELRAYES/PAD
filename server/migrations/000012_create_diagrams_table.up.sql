-- 000012_create_diagrams_table.up.sql
CREATE TABLE IF NOT EXISTS diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    mermaid_code TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    tier1_code TEXT,
    tier2_code TEXT,
    tier3_code TEXT,
    active_tier INT,
    validation_error TEXT,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagrams_idea_id ON diagrams(idea_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_type ON diagrams(type);
