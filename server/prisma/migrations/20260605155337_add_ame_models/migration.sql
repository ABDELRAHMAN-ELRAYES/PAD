-- AlterTable
ALTER TABLE "iteration_suggestions" ADD COLUMN     "applied_action_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "plan_id" TEXT,
ADD COLUMN     "total_action_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "modification_plans" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "modification_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modification_plan_actions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "new_content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "artifact_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modification_plan_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_change_records" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "from_version" INTEGER,
    "to_version" INTEGER,
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_change_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "iteration_suggestions" ADD CONSTRAINT "iteration_suggestions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "modification_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modification_plans" ADD CONSTRAINT "modification_plans_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "iteration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modification_plan_actions" ADD CONSTRAINT "modification_plan_actions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "modification_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_change_records" ADD CONSTRAINT "artifact_change_records_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "modification_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
