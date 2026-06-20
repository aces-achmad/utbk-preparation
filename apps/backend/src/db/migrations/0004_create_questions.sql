CREATE TABLE IF NOT EXISTS questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL UNIQUE,
  topic_slug VARCHAR(255) NOT NULL,
  type ENUM('single_choice', 'multiple_response') NOT NULL,
  source VARCHAR(255) NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
  status ENUM('draft', 'published') NOT NULL,
  question_text LONGTEXT NOT NULL,
  explanation_text LONGTEXT NOT NULL,
  options_json JSON NOT NULL,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
