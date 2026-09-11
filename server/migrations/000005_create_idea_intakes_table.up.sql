-- 000005_create_idea_intakes_table.up.sql
CREATE TABLE IF NOT EXISTS idea_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    refined_text TEXT,
    business_description TEXT,
    analysis_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_intakes_idea_id ON idea_intakes(idea_id);
