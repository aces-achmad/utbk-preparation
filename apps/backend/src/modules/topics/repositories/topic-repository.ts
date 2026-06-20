import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type TopicRecord = {
  slug: string;
  subjectSlug: string;
  label: string;
  displayOrder: number;
  isArchived: boolean;
};

type TopicRow = RowDataPacket & {
  slug: string;
  subject_slug: string;
  label: string;
  display_order: number;
  is_archived: number;
};

export class TopicRepository {
  constructor(private readonly pool: Pool) {}

  async list() {
    const [rows] = await this.pool.query<TopicRow[]>(
      `SELECT slug, subject_slug, label, display_order, is_archived
       FROM topics
       ORDER BY subject_slug ASC, display_order ASC, slug ASC`,
    );

    return rows.map(mapTopicRow);
  }

  async findBySlug(slug: string) {
    const [rows] = await this.pool.query<TopicRow[]>(
      `SELECT slug, subject_slug, label, display_order, is_archived
       FROM topics
       WHERE slug = ?`,
      [slug],
    );

    return rows[0] ? mapTopicRow(rows[0]) : null;
  }

  async create(input: {
    slug: string;
    subjectSlug: string;
    label: string;
    displayOrder: number;
  }) {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO topics (slug, subject_slug, label, display_order)
       VALUES (?, ?, ?, ?)`,
      [input.slug, input.subjectSlug, input.label, input.displayOrder],
    );

    return this.findBySlug(input.slug);
  }

  async update(
    slug: string,
    input: {
      label: string;
      displayOrder: number;
      isArchived?: boolean;
    },
  ) {
    await this.pool.query<ResultSetHeader>(
      `UPDATE topics
       SET label = ?, display_order = ?, is_archived = COALESCE(?, is_archived)
       WHERE slug = ?`,
      [input.label, input.displayOrder, input.isArchived === undefined ? null : Number(input.isArchived), slug],
    );

    return this.findBySlug(slug);
  }

  async countActiveQuestions(slug: string) {
    const [rows] = await this.pool.query<Array<RowDataPacket & { count: number }>>(
      `SELECT COUNT(*) AS count
       FROM questions
       WHERE topic_slug = ? AND is_archived = 0`,
      [slug],
    );

    return Number(rows[0]?.count ?? 0);
  }
}

function mapTopicRow(row: TopicRow): TopicRecord {
  return {
    slug: row.slug,
    subjectSlug: row.subject_slug,
    label: row.label,
    displayOrder: row.display_order,
    isArchived: Boolean(row.is_archived),
  };
}
