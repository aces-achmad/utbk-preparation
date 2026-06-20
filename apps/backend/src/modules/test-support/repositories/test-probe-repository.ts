import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type TestProbeRecord = RowDataPacket & {
  id: number;
  label: string;
  created_at: Date;
};

export class TestProbeRepository {
  constructor(private readonly pool: Pool) {}

  async create(label: string) {
    const [result] = await this.pool.query<ResultSetHeader>(
      "INSERT INTO test_probe_records (label) VALUES (?)",
      [label],
    );

    return result.insertId;
  }

  async list() {
    const [rows] = await this.pool.query<TestProbeRecord[]>(
      "SELECT id, label, created_at FROM test_probe_records ORDER BY id ASC",
    );

    return rows;
  }
}
