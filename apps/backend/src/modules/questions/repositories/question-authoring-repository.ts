import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { CanonicalImportQuestionOption } from "@utbk/shared/imports";

export type QuestionRecord = {
  externalId: string;
  topicSlug: string;
  subjectSlug: string | null;
  subjectLabel: string | null;
  topicLabel: string | null;
  type: "single_choice" | "multiple_response";
  source: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  questionText: string;
  explanationText: string;
  options: CanonicalImportQuestionOption[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type QuestionRow = RowDataPacket & {
  external_id: string;
  topic_slug: string;
  subject_slug: string | null;
  subject_label: string | null;
  topic_label: string | null;
  type: "single_choice" | "multiple_response";
  source: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  question_text: string;
  explanation_text: string;
  options_json: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type QuestionListFilters = {
  page: number;
  pageSize: number;
  status?: "draft" | "published";
  subjectSlug?: string;
  topicSlug?: string;
  difficulty?: "easy" | "medium" | "hard";
  archived?: boolean;
  search?: string;
};

export class QuestionAuthoringRepository {
  constructor(private readonly pool: Pool) {}

  async findByExternalId(externalId: string) {
    const [rows] = await this.pool.query<QuestionRow[]>(
      `${baseQuestionSelect()}
       WHERE q.external_id = ?`,
      [externalId],
    );

    return rows[0] ? mapQuestionRow(rows[0]) : null;
  }

  async list(filters: QuestionListFilters) {
    const where: string[] = [];
    const params: Array<string | number> = [];

    if (filters.status) {
      where.push("q.status = ?");
      params.push(filters.status);
    }

    if (filters.subjectSlug) {
      where.push("t.subject_slug = ?");
      params.push(filters.subjectSlug);
    }

    if (filters.topicSlug) {
      where.push("q.topic_slug = ?");
      params.push(filters.topicSlug);
    }

    if (filters.difficulty) {
      where.push("q.difficulty = ?");
      params.push(filters.difficulty);
    }

    if (filters.archived !== undefined) {
      where.push("q.is_archived = ?");
      params.push(Number(filters.archived));
    }

    if (filters.search) {
      where.push("(q.external_id LIKE ? OR q.question_text LIKE ?)");
      const likeValue = `%${filters.search}%`;
      params.push(likeValue, likeValue);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows] = await this.pool.query<QuestionRow[]>(
      `${baseQuestionSelect()}
       ${whereSql}
       ORDER BY q.updated_at DESC, q.external_id ASC
       LIMIT ? OFFSET ?`,
      [...params, filters.pageSize, offset],
    );

    const [countRows] = await this.pool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total
       FROM questions q
       LEFT JOIN topics t ON t.slug = q.topic_slug
       ${whereSql}`,
      params,
    );

    return {
      items: rows.map(mapQuestionRow),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async create(input: {
    externalId: string;
    topicSlug: string;
    type: "single_choice" | "multiple_response";
    source: string;
    difficulty: "easy" | "medium" | "hard";
    status: "draft" | "published";
    questionText: string;
    explanationText: string;
    options: CanonicalImportQuestionOption[];
  }) {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO questions (
        external_id,
        topic_slug,
        type,
        source,
        difficulty,
        status,
        question_text,
        explanation_text,
        options_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.externalId,
        input.topicSlug,
        input.type,
        input.source,
        input.difficulty,
        input.status,
        input.questionText,
        input.explanationText,
        JSON.stringify(input.options),
      ],
    );

    return this.findByExternalId(input.externalId);
  }

  async update(
    externalId: string,
    input: {
      topicSlug: string;
      type: "single_choice" | "multiple_response";
      source: string;
      difficulty: "easy" | "medium" | "hard";
      status: "draft" | "published";
      questionText: string;
      explanationText: string;
      options: CanonicalImportQuestionOption[];
      isArchived?: boolean;
    },
  ) {
    await this.pool.query<ResultSetHeader>(
      `UPDATE questions
       SET topic_slug = ?,
           type = ?,
           source = ?,
           difficulty = ?,
           status = ?,
           question_text = ?,
           explanation_text = ?,
           options_json = ?,
           is_archived = COALESCE(?, is_archived)
       WHERE external_id = ?`,
      [
        input.topicSlug,
        input.type,
        input.source,
        input.difficulty,
        input.status,
        input.questionText,
        input.explanationText,
        JSON.stringify(input.options),
        input.isArchived === undefined ? null : Number(input.isArchived),
        externalId,
      ],
    );

    return this.findByExternalId(externalId);
  }
}

function baseQuestionSelect() {
  return `SELECT
    q.external_id,
    q.topic_slug,
    t.subject_slug,
    s.label AS subject_label,
    t.label AS topic_label,
    q.type,
    q.source,
    q.difficulty,
    q.status,
    q.question_text,
    q.explanation_text,
    q.options_json,
    q.is_archived,
    q.created_at,
    q.updated_at
  FROM questions q
  LEFT JOIN topics t ON t.slug = q.topic_slug
  LEFT JOIN subjects s ON s.slug = t.subject_slug`;
}

function mapQuestionRow(row: QuestionRow): QuestionRecord {
  return {
    externalId: row.external_id,
    topicSlug: row.topic_slug,
    subjectSlug: row.subject_slug,
    subjectLabel: row.subject_label,
    topicLabel: row.topic_label,
    type: row.type,
    source: row.source,
    difficulty: row.difficulty,
    status: row.status,
    questionText: row.question_text,
    explanationText: row.explanation_text,
    options: JSON.parse(row.options_json) as CanonicalImportQuestionOption[],
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
