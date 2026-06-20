import type { Pool, RowDataPacket } from "mysql2/promise";

export type ExistingQuestionPreviewRecord = {
  externalId: string;
  status: "draft" | "published";
};

type ExistingQuestionRow = RowDataPacket & {
  external_id: string;
  status: "draft" | "published";
};

export class QuestionPreviewRepository {
  constructor(private readonly pool: Pool) {}

  async findByExternalIds(externalIds: string[]) {
    if (externalIds.length === 0) {
      return [];
    }

    const placeholders = externalIds.map(() => "?").join(", ");
    const [rows] = await this.pool.query<ExistingQuestionRow[]>(
      `SELECT external_id, status
       FROM questions
       WHERE external_id IN (${placeholders})`,
      externalIds,
    );

    return rows.map<ExistingQuestionPreviewRecord>((row) => ({
      externalId: row.external_id,
      status: row.status,
    }));
  }
}
