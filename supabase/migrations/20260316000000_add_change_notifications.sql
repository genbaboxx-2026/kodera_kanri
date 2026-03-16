-- 変更通知の確認状態を追跡するテーブル
CREATE TABLE IF NOT EXISTS assignment_change_notifications (
  id SERIAL PRIMARY KEY,
  worker_id INT NOT NULL REFERENCES workers(id),
  target_date DATE NOT NULL,
  site_name TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'removed')),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_notifications_worker_date
  ON assignment_change_notifications(worker_id, target_date);

-- RLS
ALTER TABLE assignment_change_notifications ENABLE ROW LEVEL SECURITY;

-- 管理者・スタッフは全操作可能
CREATE POLICY "admin_staff_change_notifications" ON assignment_change_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_id = auth.uid()
        AND w.role IN ('社長', 'スタッフ')
    )
  );
