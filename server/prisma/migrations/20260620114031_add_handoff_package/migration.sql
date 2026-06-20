-- CreateTable
CREATE TABLE "handoff_packages" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "zip_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_artifacts" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_artifact_versions" (
    "id" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handoff_artifact_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "handoff_packages_idea_id_version_key" ON "handoff_packages"("idea_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "handoff_artifacts_package_id_file_path_key" ON "handoff_artifacts"("package_id", "file_path");

-- CreateIndex
CREATE UNIQUE INDEX "handoff_artifact_versions_artifact_id_version_key" ON "handoff_artifact_versions"("artifact_id", "version");

-- AddForeignKey
ALTER TABLE "handoff_packages" ADD CONSTRAINT "handoff_packages_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_artifacts" ADD CONSTRAINT "handoff_artifacts_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "handoff_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_artifact_versions" ADD CONSTRAINT "handoff_artifact_versions_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "handoff_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
