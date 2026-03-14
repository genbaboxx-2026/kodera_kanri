-- workersテーブルにLINE連携用のカラムを追加
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- インデックスを追加（LINEユーザーIDでの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_workers_line_user_id ON workers(line_user_id);
