import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  IDiscoveryQuestionnaire,
  IDiscoveryQuestion,
  IDiscoveryAnswer,
} from "./types/discovery.interface";

@Injectable()
export class DiscoveryRepository {
  private static instance: DiscoveryRepository;

  constructor(private readonly db: DatabaseService) {
    DiscoveryRepository.instance = this;
  }

  static getInstance(): DiscoveryRepository {
    return DiscoveryRepository.instance;
  }

  private parseOptions(optionsRaw: any): string[] | null {
    if (!optionsRaw) return null;
    if (Array.isArray(optionsRaw)) return optionsRaw;
    if (typeof optionsRaw === "string") {
      try {
        const parsed = JSON.parse(optionsRaw);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  async saveQuestionnaire(
    ideaId: string,
    questions: Array<{
      id?: string;
      key?: string;
      question?: string;
      label?: string;
      type?: string;
      options?: string[];
      position?: number;
    }>,
  ): Promise<IDiscoveryQuestionnaire> {
    return this.db.withTransaction(async (client) => {
      // Upsert discovery questionnaire root
      const qnSql = `
        INSERT INTO discovery_questionnaires (idea_id, generated_at)
        VALUES ($1, NOW())
        ON CONFLICT (idea_id) DO UPDATE
        SET generated_at = NOW()
        RETURNING id, idea_id, generated_at;
      `;
      const qnRows = await client.query(qnSql, [ideaId]);
      const questionnaire = qnRows[0];

      // Delete previous questions for this questionnaire if regenerating
      await client.execute(
        `DELETE FROM discovery_questions WHERE questionnaire_id = $1;`,
        [questionnaire.id],
      );

      const savedQuestions: IDiscoveryQuestion[] = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionKey = q.key || q.id || `q_${i + 1}`;
        const questionText = q.question || q.label || "";
        const questionType = q.type || "text";
        const optionsJson = q.options ? JSON.stringify(q.options) : null;
        const position = q.position !== undefined ? q.position : i;

        const qSql = `
          INSERT INTO discovery_questions (questionnaire_id, question_key, question_text, question_type, options, position)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, question_key, question_text, question_type, options, position;
        `;
        const qRows = await client.query(qSql, [
          questionnaire.id,
          questionKey,
          questionText,
          questionType,
          optionsJson,
          position,
        ]);
        const row = qRows[0];
        const parsedOptions = this.parseOptions(row.options);

        savedQuestions.push({
          id: row.id,
          questionKey: row.question_key,
          questionText: row.question_text,
          questionType: row.question_type,
          options: parsedOptions,
          position: Number(row.position),
          label: row.question_text,
          key: row.question_key,
          type: row.question_type,
          required: true,
        });
      }

      return {
        id: questionnaire.id,
        ideaId: questionnaire.idea_id,
        generatedAt: new Date(questionnaire.generated_at),
        questions: savedQuestions,
      };
    });
  }

  async getQuestionnaireByIdeaId(
    ideaId: string,
  ): Promise<IDiscoveryQuestionnaire | null> {
    const qnSql = `
      SELECT id, idea_id, generated_at
      FROM discovery_questionnaires
      WHERE idea_id = $1
      LIMIT 1;
    `;
    const qn = await this.db.queryOne(qnSql, [ideaId]);
    if (!qn) return null;

    const questionsSql = `
      SELECT id, question_key, question_text, question_type, options, position
      FROM discovery_questions
      WHERE questionnaire_id = $1
      ORDER BY position ASC;
    `;
    const questionsRows = await this.db.query(questionsSql, [qn.id]);
    const questions: IDiscoveryQuestion[] = questionsRows.map((r) => {
      const parsedOptions = this.parseOptions(r.options);
      return {
        id: r.id,
        questionKey: r.question_key,
        questionText: r.question_text,
        questionType: r.question_type,
        options: parsedOptions,
        position: Number(r.position),
        label: r.question_text,
        key: r.question_key,
        type: r.question_type,
        required: true,
      };
    });

    return {
      id: qn.id,
      ideaId: qn.idea_id,
      generatedAt: new Date(qn.generated_at),
      questions,
    };
  }

  async saveAnswers(
    ideaId: string,
    answers: Array<{ questionId?: string; questionKey?: string; value: any }>,
  ): Promise<IDiscoveryAnswer[]> {
    const questionnaire = await this.getQuestionnaireByIdeaId(ideaId);
    if (!questionnaire) {
      throw new Error("Questionnaire does not exist for this idea");
    }

    return this.db.withTransaction(async (client) => {
      const savedAnswers: IDiscoveryAnswer[] = [];

      for (const ans of answers) {
        let questionId = ans.questionId;
        if (!questionId && ans.questionKey) {
          const match = questionnaire.questions.find(
            (q) => q.questionKey === ans.questionKey,
          );
          if (match) questionId = match.id;
        }

        if (!questionId) continue;

        const ansSql = `
          INSERT INTO discovery_answers (question_id, answer_value, submitted_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (question_id) DO UPDATE
          SET answer_value = EXCLUDED.answer_value, submitted_at = NOW()
          RETURNING id, question_id, answer_value, submitted_at;
        `;
        const ansRows = await client.query(ansSql, [
          questionId,
          JSON.stringify(ans.value),
        ]);
        const row = ansRows[0];
        savedAnswers.push({
          id: row.id,
          questionId: row.question_id,
          answerValue: row.answer_value,
          submittedAt: new Date(row.submitted_at),
        });
      }

      return savedAnswers;
    });
  }

  async getAnswersByIdeaId(ideaId: string): Promise<IDiscoveryAnswer[]> {
    const questionnaire = await this.getQuestionnaireByIdeaId(ideaId);
    if (!questionnaire) return [];

    const sql = `
      SELECT a.id, a.question_id, a.answer_value, a.submitted_at
      FROM discovery_answers a
      JOIN discovery_questions q ON a.question_id = q.id
      WHERE q.questionnaire_id = $1;
    `;
    const rows = await this.db.query(sql, [questionnaire.id]);
    return rows.map((r) => ({
      id: r.id,
      questionId: r.question_id,
      answerValue: r.answer_value,
      submittedAt: new Date(r.submitted_at),
    }));
  }
}
