-- CreateTable
CREATE TABLE "iteration_sessions" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iteration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iteration_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iteration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iteration_suggestions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iteration_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iteration_suggestion_actions" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "new_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iteration_suggestion_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "iteration_sessions_idea_id_key" ON "iteration_sessions"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "iteration_suggestions_message_id_key" ON "iteration_suggestions"("message_id");

-- AddForeignKey
ALTER TABLE "iteration_sessions" ADD CONSTRAINT "iteration_sessions_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iteration_messages" ADD CONSTRAINT "iteration_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "iteration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iteration_suggestions" ADD CONSTRAINT "iteration_suggestions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "iteration_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iteration_suggestion_actions" ADD CONSTRAINT "iteration_suggestion_actions_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "iteration_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
