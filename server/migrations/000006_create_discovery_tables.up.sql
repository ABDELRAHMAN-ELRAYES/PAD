-- 000006_create_discovery_tables.up.sql
CREATE TABLE IF NOT EXISTS discovery_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES discovery_questionnaires(id) ON DELETE CASCADE,
    question_key VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'text',
    options JSONB,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID UNIQUE NOT NULL REFERENCES discovery_questions(id) ON DELETE CASCADE,
    answer_value JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_questions_qid ON discovery_questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_discovery_answers_qid ON discovery_answers(question_id);
