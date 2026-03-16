-- assignment_workers テーブルに is_foreman フラグを追加
ALTER TABLE assignment_workers
ADD COLUMN IF NOT EXISTS is_foreman BOOLEAN NOT NULL DEFAULT FALSE;
