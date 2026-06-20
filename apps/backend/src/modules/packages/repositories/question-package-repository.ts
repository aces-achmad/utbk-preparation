import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type QuestionPackageRecord = {
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published";
  isArchived: boolean;
  isInvalid: boolean;
  invalidReason: string | null;
  itemCount: number;
  availableForPractice: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuestionPackageItemRecord = {
  questionExternalId: string;
  canonicalOrder: number;
  questionStatus: "draft" | "published" | null;
  questionIsArchived: boolean;
  questionText: string | null;
};

type QuestionPackageRow = RowDataPacket & {
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published";
  is_archived: number;
  is_invalid: number;
  invalid_reason: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
};

type QuestionPackageItemRow = RowDataPacket & {
  question_external_id: string;
  canonical_order: number;
  question_status: "draft" | "published" | null;
  question_is_archived: number | null;
  question_text: string | null;
};

export class QuestionPackageRepository {
  constructor(private readonly pool: Pool) {}

  async list() {
    const [rows] = await this.pool.query<QuestionPackageRow[]>(
      `SELECT
        p.slug,
        p.name,
        p.description,
        p.status,
        p.is_archived,
        p.is_invalid,
        p.invalid_reason,
        COUNT(i.id) AS item_count,
        p.created_at,
        p.updated_at
      FROM question_packages p
      LEFT JOIN question_package_items i ON i.package_slug = p.slug
      GROUP BY
        p.slug,
        p.name,
        p.description,
        p.status,
        p.is_archived,
        p.is_invalid,
        p.invalid_reason,
        p.created_at,
        p.updated_at
      ORDER BY p.updated_at DESC, p.slug ASC`,
    );

    return rows.map(mapQuestionPackageRow);
  }

  async listAvailableForPractice() {
    const allPackages = await this.list();

    return allPackages.filter((item) => item.availableForPractice);
  }

  async findBySlug(slug: string) {
    const [rows] = await this.pool.query<QuestionPackageRow[]>(
      `SELECT
        p.slug,
        p.name,
        p.description,
        p.status,
        p.is_archived,
        p.is_invalid,
        p.invalid_reason,
        COUNT(i.id) AS item_count,
        p.created_at,
        p.updated_at
      FROM question_packages p
      LEFT JOIN question_package_items i ON i.package_slug = p.slug
      WHERE p.slug = ?
      GROUP BY
        p.slug,
        p.name,
        p.description,
        p.status,
        p.is_archived,
        p.is_invalid,
        p.invalid_reason,
        p.created_at,
        p.updated_at`,
      [slug],
    );

    return rows[0] ? mapQuestionPackageRow(rows[0]) : null;
  }

  async create(input: {
    slug: string;
    name: string;
    description: string | null;
  }) {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO question_packages (slug, name, description) VALUES (?, ?, ?)`,
      [input.slug, input.name, input.description],
    );

    return this.findBySlug(input.slug);
  }

  async updateMetadata(
    slug: string,
    input: {
      name: string;
      description: string | null;
      status?: "draft" | "published";
      isArchived?: boolean;
      isInvalid?: boolean;
      invalidReason?: string | null;
    },
  ) {
    await this.pool.query<ResultSetHeader>(
      `UPDATE question_packages
       SET name = ?,
           description = ?,
           status = COALESCE(?, status),
           is_archived = COALESCE(?, is_archived),
           is_invalid = COALESCE(?, is_invalid),
           invalid_reason = COALESCE(?, invalid_reason)
       WHERE slug = ?`,
      [
        input.name,
        input.description,
        input.status ?? null,
        input.isArchived === undefined ? null : Number(input.isArchived),
        input.isInvalid === undefined ? null : Number(input.isInvalid),
        input.invalidReason === undefined ? null : input.invalidReason,
        slug,
      ],
    );

    return this.findBySlug(slug);
  }

  async replaceItems(slug: string, questionExternalIds: string[]) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(`DELETE FROM question_package_items WHERE package_slug = ?`, [slug]);

      for (let index = 0; index < questionExternalIds.length; index += 1) {
        await connection.query(
          `INSERT INTO question_package_items (package_slug, question_external_id, canonical_order)
           VALUES (?, ?, ?)`,
          [slug, questionExternalIds[index], index + 1],
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

  async listItems(slug: string) {
    const [rows] = await this.pool.query<QuestionPackageItemRow[]>(
      `SELECT
        i.question_external_id,
        i.canonical_order,
        q.status AS question_status,
        q.is_archived AS question_is_archived,
        q.question_text
      FROM question_package_items i
      LEFT JOIN questions q ON q.external_id = i.question_external_id
      WHERE i.package_slug = ?
      ORDER BY i.canonical_order ASC`,
      [slug],
    );

    return rows.map((row) => ({
      questionExternalId: row.question_external_id,
      canonicalOrder: row.canonical_order,
      questionStatus: row.question_status,
      questionIsArchived: Boolean(row.question_is_archived ?? 0),
      questionText: row.question_text,
    }));
  }

  async listByQuestionExternalId(questionExternalId: string) {
    const [rows] = await this.pool.query<Array<RowDataPacket & { package_slug: string }>>(
      `SELECT package_slug
       FROM question_package_items
       WHERE question_external_id = ?`,
      [questionExternalId],
    );

    return rows.map((row) => String(row.package_slug));
  }
}

function mapQuestionPackageRow(row: QuestionPackageRow): QuestionPackageRecord {
  const availableForPractice =
    row.status === "published" && !Boolean(row.is_archived) && !Boolean(row.is_invalid);

  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    isArchived: Boolean(row.is_archived),
    isInvalid: Boolean(row.is_invalid),
    invalidReason: row.invalid_reason,
    itemCount: Number(row.item_count),
    availableForPractice,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
