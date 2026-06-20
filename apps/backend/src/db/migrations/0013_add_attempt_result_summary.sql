ALTER TABLE attempts
  ADD COLUMN correct_count INT NULL DEFAULT NULL AFTER submitted_at,
  ADD COLUMN incorrect_count INT NULL DEFAULT NULL AFTER correct_count,
  ADD COLUMN unanswered_count INT NULL DEFAULT NULL AFTER incorrect_count,
  ADD COLUMN score_percentage DECIMAL(5,2) NULL DEFAULT NULL AFTER unanswered_count;
