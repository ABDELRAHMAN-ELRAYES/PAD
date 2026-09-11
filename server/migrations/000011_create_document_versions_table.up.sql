-- 000011_create_document_versions_table.up.sql
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content TEXT NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_versions_doc_ver UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON document_versions(document_id);
