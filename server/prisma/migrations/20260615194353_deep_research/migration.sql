-- AlterTable
ALTER TABLE "ideas" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "research_result" JSONB;

-- CreateTable
CREATE TABLE "discovery_questionnaires" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_responses" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_jobs" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_phase" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "logs" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discovery_questionnaires_idea_id_key" ON "discovery_questionnaires"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_idea_id_key" ON "questionnaire_responses"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_jobs_idea_id_key" ON "research_jobs"("idea_id");

-- AddForeignKey
ALTER TABLE "discovery_questionnaires" ADD CONSTRAINT "discovery_questionnaires_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
