CREATE TABLE IF NOT EXISTS attempt_question_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  package_slug_snapshot VARCHAR(255) NOT NULL,
  question_external_id VARCHAR(255) NOT NULL,
  question_order INT UNSIGNED NOT NULL,
  subject_label_snapshot VARCHAR(255) NULL,
  topic_label_snapshot VARCHAR(255) NULL,
  difficulty_snapshot ENUM('easy', 'medium', 'hard') NOT NULL,
  type_snapshot ENUM('single_choice', 'multiple_response') NOT NULL,
  question_text_snapshot LONGTEXT NOT NULL,
  explanation_text_snapshot LONGTEXT NOT NULL,
  options_snapshot_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attempt_snapshot_order UNIQUE (attempt_id, question_order),
  CONSTRAINT fk_attempt_snapshot_attempt
    FOREIGN KEY (attempt_id) REFERENCES attempts(id)
    ON DELETE CASCADE
);
