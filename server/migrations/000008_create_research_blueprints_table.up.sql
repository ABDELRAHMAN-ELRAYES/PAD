-- 000008_create_research_blueprints_table.up.sql
CREATE TABLE IF NOT EXISTS research_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    synthesis_summary TEXT,
    understanding TEXT,
    competitors TEXT,
    market_analysis TEXT,
    architecture TEXT,
    suggested_scope TEXT,
    risks_and_concerns TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_blueprints_idea_id ON research_blueprints(idea_id);
