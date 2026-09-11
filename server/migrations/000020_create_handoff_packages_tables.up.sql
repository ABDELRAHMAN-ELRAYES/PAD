-- 000020_create_handoff_packages_tables.up.sql
CREATE TABLE IF NOT EXISTS handoff_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    zip_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_handoff_packages_idea_ver UNIQUE (idea_id, version)
);

CREATE TABLE IF NOT EXISTS handoff_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES handoff_packages(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_handoff_artifacts_pkg_path UNIQUE (package_id, file_path)
);

CREATE TABLE IF NOT EXISTS handoff_artifact_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES handoff_artifacts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content TEXT NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_handoff_art_versions_art_ver UNIQUE (artifact_id, version)
);

CREATE INDEX IF NOT EXISTS idx_handoff_packages_idea_id ON handoff_packages(idea_id);
CREATE INDEX IF NOT EXISTS idx_handoff_artifacts_package_id ON handoff_artifacts(package_id);
