-- 000007_create_research_jobs_table.up.sql
CREATE TABLE IF NOT EXISTS research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_phase VARCHAR(50),
    progress INT NOT NULL DEFAULT 0,
    logs JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_idea_id ON research_jobs(idea_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
