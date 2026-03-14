-- ============================================
-- 作業員マスターにログイン機能を統合
-- ============================================

-- workersテーブルにメールアドレスとシステム権限を追加
ALTER TABLE workers ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS system_role TEXT CHECK (system_role IN ('管理者', '現場スタッフ'));

-- メールアドレスが設定されている作業員はログイン可能
-- system_roleがNULLの場合はログイン不可

COMMENT ON COLUMN workers.email IS 'ログイン用メールアドレス（任意）';
COMMENT ON COLUMN workers.system_role IS 'システム権限（管理者/現場スタッフ）';
