-- 000003_create_admin_privileges_table.up.sql
CREATE TABLE IF NOT EXISTS admin_privileges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_privileges_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_admin_privileges_user_id ON admin_privileges(user_id);
