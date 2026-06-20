CREATE TABLE IF NOT EXISTS import_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uploaded_by_admin_user_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  status ENUM('preview_ready', 'preview_invalid') NOT NULL,
  schema_version VARCHAR(32) NULL,
  raw_payload LONGTEXT NOT NULL,
  question_count INT UNSIGNED NOT NULL DEFAULT 0,
  insert_count INT UNSIGNED NOT NULL DEFAULT 0,
  update_count INT UNSIGNED NOT NULL DEFAULT 0,
  invalid_record_count INT UNSIGNED NOT NULL DEFAULT 0,
  sensitive_update_count INT UNSIGNED NOT NULL DEFAULT 0,
  preview_result_json JSON NOT NULL,
  preview_generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_import_sessions_admin_user
    FOREIGN KEY (uploaded_by_admin_user_id) REFERENCES admin_users(id)
    ON DELETE CASCADE
);
