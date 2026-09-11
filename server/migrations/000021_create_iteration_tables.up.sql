-- 000021_create_iteration_tables.up.sql
CREATE TABLE IF NOT EXISTS iteration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iteration_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES iteration_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iteration_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID UNIQUE NOT NULL REFERENCES iteration_messages(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iteration_suggestion_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES iteration_suggestions(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    new_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iteration_messages_session_id ON iteration_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_iteration_sug_actions_sug_id ON iteration_suggestion_actions(suggestion_id);
