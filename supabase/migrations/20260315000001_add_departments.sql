-- ============================================
-- 所属マスターテーブルを追加
-- ============================================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 既存の所属をマスターに登録
INSERT INTO departments (name, display_order) VALUES
  ('仮設事業部', 1),
  ('経営管理部', 2),
  ('管理課', 3)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_staff_departments" ON departments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));

-- workersテーブルからrole列を削除（不要になった）
-- ALTER TABLE workers DROP COLUMN IF EXISTS role;
