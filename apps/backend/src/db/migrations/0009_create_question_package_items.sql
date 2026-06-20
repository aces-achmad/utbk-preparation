CREATE TABLE IF NOT EXISTS question_package_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  package_slug VARCHAR(255) NOT NULL,
  question_external_id VARCHAR(255) NOT NULL,
  canonical_order INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_package_order UNIQUE (package_slug, canonical_order),
  CONSTRAINT uq_package_question UNIQUE (package_slug, question_external_id)
);
