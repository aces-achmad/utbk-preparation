import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { CanonicalImportQuestionOption } from "@utbk/shared/imports";

export type AttemptRecord = {
  id: number;
  packageSlug: string;
  status: "active" | "submitted";
  questionCount: number;
  startedAt: string;
  submittedAt: string | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  scorePercentage: number | null;
};

export type AttemptQuestionSnapshotRecord = {
  id: number;
  attemptId: number;
  packageSlugSnapshot: string;
  questionExternalId: string;
  questionOrder: number;
  subjectLabelSnapshot: string | null;
  topicLabelSnapshot: string | null;
  difficultySnapshot: "easy" | "medium" | "hard";
  typeSnapshot: "single_choice" | "multiple_response";
  questionTextSnapshot: string;
  explanationTextSnapshot: string;
  optionsSnapshot: CanonicalImportQuestionOption[];
  selectedOptionKeys: string[];
};

type AttemptRow = RowDataPacket & {
  id: number;
  package_slug: string;
  status: "active" | "submitted";
  question_count: number;
  started_at: string;
  submitted_at: string | null;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  score_percentage: string | number | null;
};

type AttemptQuestionSnapshotRow = RowDataPacket & {
  id: number;
  attempt_id: number;
  package_slug_snapshot: string;
  question_external_id: string;
  question_order: number;
  subject_label_snapshot: string | null;
  topic_label_snapshot: string | null;
  difficulty_snapshot: "easy" | "medium" | "hard";
  type_snapshot: "single_choice" | "multiple_response";
  question_text_snapshot: string;
  explanation_text_snapshot: string;
  options_snapshot_json: string;
  selected_option_keys_json: string | null;
};

export class AttemptRepository {
  constructor(private readonly pool: Pool) {}

  async findActiveByPackageSlug(packageSlug: string) {
    const [rows] = await this.pool.query<AttemptRow[]>(
      `SELECT
         id,
         package_slug,
         status,
         question_count,
         started_at,
         submitted_at,
         correct_count,
         incorrect_count,
         unanswered_count,
         score_percentage
       FROM attempts
       WHERE package_slug = ? AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [packageSlug],
    );

    return rows[0] ? mapAttemptRow(rows[0]) : null;
  }

  async findById(id: number) {
    const [rows] = await this.pool.query<AttemptRow[]>(
      `SELECT
         id,
         package_slug,
         status,
         question_count,
         started_at,
         submitted_at,
         correct_count,
         incorrect_count,
         unanswered_count,
         score_percentage
       FROM attempts
       WHERE id = ?`,
      [id],
    );

    return rows[0] ? mapAttemptRow(rows[0]) : null;
  }

  async createAttempt(input: { packageSlug: string; questionCount: number }) {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO attempts (package_slug, question_count) VALUES (?, ?)`,
      [input.packageSlug, input.questionCount],
    );

    return this.findById(Number(result.insertId));
  }

  async createSnapshots(
    attemptId: number,
    snapshots: Array<{
      packageSlugSnapshot: string;
      questionExternalId: string;
      questionOrder: number;
      subjectLabelSnapshot: string | null;
      topicLabelSnapshot: string | null;
      difficultySnapshot: "easy" | "medium" | "hard";
      typeSnapshot: "single_choice" | "multiple_response";
      questionTextSnapshot: string;
      explanationTextSnapshot: string;
      optionsSnapshot: CanonicalImportQuestionOption[];
    }>,
  ) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const snapshot of snapshots) {
        await connection.query(
          `INSERT INTO attempt_question_snapshots (
            attempt_id,
            package_slug_snapshot,
            question_external_id,
            question_order,
            subject_label_snapshot,
            topic_label_snapshot,
            difficulty_snapshot,
            type_snapshot,
            question_text_snapshot,
            explanation_text_snapshot,
            options_snapshot_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attemptId,
            snapshot.packageSlugSnapshot,
            snapshot.questionExternalId,
            snapshot.questionOrder,
            snapshot.subjectLabelSnapshot,
            snapshot.topicLabelSnapshot,
            snapshot.difficultySnapshot,
            snapshot.typeSnapshot,
            snapshot.questionTextSnapshot,
            snapshot.explanationTextSnapshot,
            JSON.stringify(snapshot.optionsSnapshot),
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listSnapshots(attemptId: number) {
    const [rows] = await this.pool.query<AttemptQuestionSnapshotRow[]>(
      `SELECT
        s.id,
        s.attempt_id,
        s.package_slug_snapshot,
        s.question_external_id,
        s.question_order,
        s.subject_label_snapshot,
        s.topic_label_snapshot,
        s.difficulty_snapshot,
        s.type_snapshot,
        s.question_text_snapshot,
        s.explanation_text_snapshot,
        s.options_snapshot_json,
        a.selected_option_keys_json
      FROM attempt_question_snapshots s
      LEFT JOIN attempt_answers a ON a.attempt_question_snapshot_id = s.id
      WHERE s.attempt_id = ?
      ORDER BY s.question_order ASC`,
      [attemptId],
    );

    return rows.map(mapSnapshotRow);
  }

  async findSnapshotById(snapshotId: number) {
    const [rows] = await this.pool.query<AttemptQuestionSnapshotRow[]>(
      `SELECT
        s.id,
        s.attempt_id,
        s.package_slug_snapshot,
        s.question_external_id,
        s.question_order,
        s.subject_label_snapshot,
        s.topic_label_snapshot,
        s.difficulty_snapshot,
        s.type_snapshot,
        s.question_text_snapshot,
        s.explanation_text_snapshot,
        s.options_snapshot_json,
        a.selected_option_keys_json
      FROM attempt_question_snapshots s
      LEFT JOIN attempt_answers a ON a.attempt_question_snapshot_id = s.id
      WHERE s.id = ?`,
      [snapshotId],
    );

    return rows[0] ? mapSnapshotRow(rows[0]) : null;
  }

  async upsertAnswer(input: {
    attemptId: number;
    snapshotId: number;
    selectedOptionKeys: string[];
  }) {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO attempt_answers (
        attempt_id,
        attempt_question_snapshot_id,
        selected_option_keys_json
      )
      SELECT ?, ?, ?
      FROM attempts
      WHERE id = ? AND status = 'active'
      ON DUPLICATE KEY UPDATE
        selected_option_keys_json = VALUES(selected_option_keys_json)`,
      [input.attemptId, input.snapshotId, JSON.stringify(input.selectedOptionKeys), input.attemptId],
    );

    return result.affectedRows > 0;
  }

  async finalizeAttempt(input: {
    attemptId: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scorePercentage: number;
  }) {
    const [result] = await this.pool.query<ResultSetHeader>(
      `UPDATE attempts
       SET
         status = 'submitted',
         submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
         correct_count = ?,
         incorrect_count = ?,
         unanswered_count = ?,
         score_percentage = ?
       WHERE id = ?`,
      [
        input.correctCount,
        input.incorrectCount,
        input.unansweredCount,
        input.scorePercentage,
        input.attemptId,
      ],
    );

    return {
      attempt: await this.findById(input.attemptId),
      updated: result.affectedRows > 0,
    };
  }
}

function mapAttemptRow(row: AttemptRow): AttemptRecord {
  return {
    id: row.id,
    packageSlug: row.package_slug,
    status: row.status,
    questionCount: row.question_count,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    unansweredCount: row.unanswered_count,
    scorePercentage:
      row.score_percentage === null ? null : Number(row.score_percentage),
  };
}

function mapSnapshotRow(row: AttemptQuestionSnapshotRow): AttemptQuestionSnapshotRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    packageSlugSnapshot: row.package_slug_snapshot,
    questionExternalId: row.question_external_id,
    questionOrder: row.question_order,
    subjectLabelSnapshot: row.subject_label_snapshot,
    topicLabelSnapshot: row.topic_label_snapshot,
    difficultySnapshot: row.difficulty_snapshot,
    typeSnapshot: row.type_snapshot,
    questionTextSnapshot: row.question_text_snapshot,
    explanationTextSnapshot: row.explanation_text_snapshot,
    optionsSnapshot: JSON.parse(row.options_snapshot_json) as CanonicalImportQuestionOption[],
    selectedOptionKeys: row.selected_option_keys_json
      ? (JSON.parse(row.selected_option_keys_json) as string[])
      : [],
  };
}
