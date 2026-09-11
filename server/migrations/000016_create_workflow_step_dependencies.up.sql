-- 000016_create_workflow_step_dependencies.up.sql
CREATE TABLE IF NOT EXISTS workflow_step_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    depends_on_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_step_dep UNIQUE (step_id, depends_on_step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_dep_step_id ON workflow_step_dependencies(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_dep_depends_on ON workflow_step_dependencies(depends_on_step_id);
