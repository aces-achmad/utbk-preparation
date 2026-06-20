CREATE TABLE IF NOT EXISTS attempt_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  attempt_question_snapshot_id BIGINT UNSIGNED NOT NULL,
  selected_option_keys_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_attempt_answer_snapshot UNIQUE (attempt_question_snapshot_id),
  CONSTRAINT fk_attempt_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempt_answers_snapshot
    FOREIGN KEY (attempt_question_snapshot_id) REFERENCES attempt_question_snapshots(id)
    ON DELETE CASCADE
);
