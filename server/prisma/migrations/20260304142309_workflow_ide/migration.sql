-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_dependencies" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "depends_on_step_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_versions" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflows_idea_id_key" ON "workflows"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_dependencies_step_id_depends_on_step_id_key" ON "workflow_step_dependencies"("step_id", "depends_on_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_versions_step_id_version_key" ON "workflow_step_versions"("step_id", "version");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_dependencies" ADD CONSTRAINT "workflow_step_dependencies_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_dependencies" ADD CONSTRAINT "workflow_step_dependencies_depends_on_step_id_fkey" FOREIGN KEY ("depends_on_step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_versions" ADD CONSTRAINT "workflow_step_versions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
