import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type StoredImportSessionPreview = {
  id: number;
  uploadedByAdminUserId: number;
  originalFilename: string;
  status: "preview_ready" | "preview_invalid";
  schemaVersion: string | null;
  rawPayload: string;
  questionCount: number;
  insertCount: number;
  updateCount: number;
  invalidRecordCount: number;
  sensitiveUpdateCount: number;
  previewResultJson: string;
};

type StoredImportSessionRow = RowDataPacket & {
  id: number;
  uploaded_by_admin_user_id: number;
  original_filename: string;
  status: "preview_ready" | "preview_invalid";
  schema_version: string | null;
  raw_payload: string;
  question_count: number;
  insert_count: number;
  update_count: number;
  invalid_record_count: number;
  sensitive_update_count: number;
  preview_result_json: string;
};

export type CreateImportSessionPreviewInput = {
  uploadedByAdminUserId: number;
  originalFilename: string;
  status: "preview_ready" | "preview_invalid";
  schemaVersion: string | null;
  rawPayload: string;
  questionCount: number;
  insertCount: number;
  updateCount: number;
  invalidRecordCount: number;
  sensitiveUpdateCount: number;
  previewResultJson: string;
};

export class ImportSessionRepository {
  constructor(private readonly pool: Pool) {}

  async createPreview(input: CreateImportSessionPreviewInput) {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO import_sessions (
        uploaded_by_admin_user_id,
        original_filename,
        status,
        schema_version,
        raw_payload,
        question_count,
        insert_count,
        update_count,
        invalid_record_count,
        sensitive_update_count,
        preview_result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.uploadedByAdminUserId,
        input.originalFilename,
        input.status,
        input.schemaVersion,
        input.rawPayload,
        input.questionCount,
        input.insertCount,
        input.updateCount,
        input.invalidRecordCount,
        input.sensitiveUpdateCount,
        input.previewResultJson,
      ],
    );

    return Number(result.insertId);
  }

  async findById(id: number) {
    const [rows] = await this.pool.query<StoredImportSessionRow[]>(
      `SELECT
        id,
        uploaded_by_admin_user_id,
        original_filename,
        status,
        schema_version,
        raw_payload,
        question_count,
        insert_count,
        update_count,
        invalid_record_count,
        sensitive_update_count,
        preview_result_json
      FROM import_sessions
      WHERE id = ?`,
      [id],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      uploadedByAdminUserId: row.uploaded_by_admin_user_id,
      originalFilename: row.original_filename,
      status: row.status,
      schemaVersion: row.schema_version,
      rawPayload: row.raw_payload,
      questionCount: row.question_count,
      insertCount: row.insert_count,
      updateCount: row.update_count,
      invalidRecordCount: row.invalid_record_count,
      sensitiveUpdateCount: row.sensitive_update_count,
      previewResultJson: row.preview_result_json,
    } satisfies StoredImportSessionPreview;
  }
}
