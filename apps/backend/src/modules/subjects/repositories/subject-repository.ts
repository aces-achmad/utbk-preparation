import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type SubjectRecord = {
  slug: string;
  label: string;
  displayOrder: number;
  isArchived: boolean;
};

type SubjectRow = RowDataPacket & {
  slug: string;
  label: string;
  display_order: number;
  is_archived: number;
};

export class SubjectRepository {
  constructor(private readonly pool: Pool) {}

  async list() {
    const [rows] = await this.pool.query<SubjectRow[]>(
      `SELECT slug, label, display_order, is_archived
       FROM subjects
       ORDER BY display_order ASC, slug ASC`,
    );

    return rows.map(mapSubjectRow);
  }

  async findBySlug(slug: string) {
    const [rows] = await this.pool.query<SubjectRow[]>(
      `SELECT slug, label, display_order, is_archived
       FROM subjects
       WHERE slug = ?`,
      [slug],
    );

    return rows[0] ? mapSubjectRow(rows[0]) : null;
  }

  async create(input: { slug: string; label: string; displayOrder: number }) {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO subjects (slug, label, display_order) VALUES (?, ?, ?)`,
      [input.slug, input.label, input.displayOrder],
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
      `UPDATE subjects
       SET label = ?, display_order = ?, is_archived = COALESCE(?, is_archived)
       WHERE slug = ?`,
      [input.label, input.displayOrder, input.isArchived === undefined ? null : Number(input.isArchived), slug],
    );

    return this.findBySlug(slug);
  }

  async countActiveTopics(slug: string) {
    const [rows] = await this.pool.query<Array<RowDataPacket & { count: number }>>(
      `SELECT COUNT(*) AS count
       FROM topics
       WHERE subject_slug = ? AND is_archived = 0`,
      [slug],
    );

    return Number(rows[0]?.count ?? 0);
  }
}

function mapSubjectRow(row: SubjectRow): SubjectRecord {
  return {
    slug: row.slug,
    label: row.label,
    displayOrder: row.display_order,
    isArchived: Boolean(row.is_archived),
  };
}
