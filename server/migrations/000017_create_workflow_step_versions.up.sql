-- 000017_create_workflow_step_versions.up.sql
CREATE TABLE IF NOT EXISTS workflow_step_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    version INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_step_ver UNIQUE (step_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_ver_step_id ON workflow_step_versions(step_id);
