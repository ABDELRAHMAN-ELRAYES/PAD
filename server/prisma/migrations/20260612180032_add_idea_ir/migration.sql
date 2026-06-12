-- CreateTable
CREATE TABLE "project_ir" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_ir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_ir_versions" (
    "id" TEXT NOT NULL,
    "project_ir_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_data" JSONB NOT NULL,
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_ir_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_ir_idea_id_key" ON "project_ir"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_ir_versions_project_ir_id_version_key" ON "project_ir_versions"("project_ir_id", "version");

-- AddForeignKey
ALTER TABLE "project_ir" ADD CONSTRAINT "project_ir_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ir_versions" ADD CONSTRAINT "project_ir_versions_project_ir_id_fkey" FOREIGN KEY ("project_ir_id") REFERENCES "project_ir"("id") ON DELETE CASCADE ON UPDATE CASCADE;
