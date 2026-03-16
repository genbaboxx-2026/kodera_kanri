-- ============================================
-- 小寺工務店 業務管理システム - スキーマ定義
-- ============================================

-- 既存テーブルを削除（開発用）
DROP TABLE IF EXISTS attendance_monthly CASCADE;
DROP TABLE IF EXISTS dezura_records CASCADE;
DROP TABLE IF EXISTS signatures CASCADE;
DROP TABLE IF EXISTS report_partners CASCADE;
DROP TABLE IF EXISTS report_work_categories CASCADE;
DROP TABLE IF EXISTS report_workers CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS assignment_locations CASCADE;
DROP TABLE IF EXISTS assignment_partners CASCADE;
DROP TABLE IF EXISTS assignment_workers CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS company_calendar CASCADE;
DROP TABLE IF EXISTS work_categories CASCADE;
DROP TABLE IF EXISTS location_types CASCADE;
DROP TABLE IF EXISTS partner_companies CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- マスターテーブル
-- ============================================

-- M1: 作業員マスター
CREATE TABLE workers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_kana VARCHAR(100) NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('正社員', '外国人技能実習生')),
  role TEXT NOT NULL CHECK (role IN ('職長', '一般', '管理', '事務', '経理', '運転手')),
  department VARCHAR(50) NOT NULL,
  fixed_overtime_hours DECIMAL(4,1) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '在籍' CHECK (status IN ('在籍', '退職')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M3: 発注元・支払者マスター
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  signer_name VARCHAR(50),
  contact VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M2: 現場マスター
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  construction_number VARCHAR(20),
  client_company_id INT NOT NULL REFERENCES companies(id),
  payer_company_id INT NOT NULL REFERENCES companies(id),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT '稼働中' CHECK (status IN ('稼働中', '完了')),
  default_contract_type TEXT CHECK (default_contract_type IN ('常用', '請負')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M4: 協力会社マスター
CREATE TABLE partner_companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M5: 勤務場所区分マスター
CREATE TABLE location_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  requires_report BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_dezura BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M6: 作業内容区分マスター
CREATE TABLE work_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

-- M7: 会社カレンダーマスター
CREATE TABLE company_calendar (
  id SERIAL PRIMARY KEY,
  fiscal_year INT NOT NULL,
  calendar_date DATE NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('出勤日', '法定休日', '所定休日')),
  UNIQUE (fiscal_year, calendar_date)
);

-- ============================================
-- トランザクションテーブル
-- ============================================

-- T1: 予定出面（配置）
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  target_date DATE NOT NULL,
  site_id INT NOT NULL REFERENCES sites(id),
  client_company_id INT NOT NULL REFERENCES companies(id),
  payer_company_id INT NOT NULL REFERENCES companies(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('常用', '請負')),
  shift_type TEXT NOT NULL DEFAULT '日勤のみ' CHECK (shift_type IN ('日勤のみ', '通し夜勤', '夜勤のみ')),
  memo TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_assignments_date_site ON assignments(target_date, site_id);

-- T2: 配置×作業員
CREATE TABLE assignment_workers (
  id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  worker_id INT NOT NULL REFERENCES workers(id),
  shift TEXT NOT NULL DEFAULT '日勤' CHECK (shift IN ('日勤', '夜勤')),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  UNIQUE (assignment_id, worker_id, shift)
);

-- T3: 配置×協力会社
CREATE TABLE assignment_partners (
  id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  partner_company_id INT NOT NULL REFERENCES partner_companies(id),
  headcount INT NOT NULL DEFAULT 1
);

-- T4: 場所配置（現場以外）
CREATE TABLE assignment_locations (
  id SERIAL PRIMARY KEY,
  target_date DATE NOT NULL,
  worker_id INT NOT NULL REFERENCES workers(id),
  location_type_id INT NOT NULL REFERENCES location_types(id)
);

-- T5: 日報
CREATE TABLE daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  site_id INT NOT NULL REFERENCES sites(id),
  reporter_id INT NOT NULL REFERENCES workers(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('常用', '請負')),
  work_start TIME NOT NULL,
  work_end TIME NOT NULL,
  night_start TIME,
  night_end TIME,
  headcount_total INT NOT NULL DEFAULT 0,
  headcount_jouyo INT NOT NULL DEFAULT 0,
  headcount_ukeoi INT NOT NULL DEFAULT 0,
  work_detail TEXT,
  weather TEXT CHECK (weather IN ('晴', '曇', '雨', '雪')),
  temperature INT,
  wind TEXT CHECK (wind IN ('強', '中', '弱', '無')),
  absent_note TEXT,
  check_status TEXT NOT NULL DEFAULT '未提出' CHECK (check_status IN ('未提出', '提出済', '1人目済', '確定')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_date_site ON daily_reports(report_date, site_id);

-- T6: 日報×作業者
CREATE TABLE report_workers (
  id SERIAL PRIMARY KEY,
  daily_report_id INT NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  worker_id INT NOT NULL REFERENCES workers(id),
  overtime_hours DECIMAL(3,1),
  overtime_start TIME,
  overtime_end TIME
);

-- T7: 日報×作業内容
CREATE TABLE report_work_categories (
  id SERIAL PRIMARY KEY,
  daily_report_id INT NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  work_category_id INT NOT NULL REFERENCES work_categories(id)
);

-- T8: 日報×協力会社
CREATE TABLE report_partners (
  id SERIAL PRIMARY KEY,
  daily_report_id INT NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  partner_company_id INT NOT NULL REFERENCES partner_companies(id),
  headcount INT NOT NULL DEFAULT 1,
  overtime_headcount INT,
  overtime_hours DECIMAL(3,1),
  overtime_start TIME,
  overtime_end TIME
);

-- ============================================
-- その他テーブル
-- ============================================

-- S1: 手書きサイン
CREATE TABLE signatures (
  id SERIAL PRIMARY KEY,
  daily_report_id INT NOT NULL UNIQUE REFERENCES daily_reports(id),
  signer_name VARCHAR(50) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked BOOLEAN NOT NULL DEFAULT TRUE
);

-- D1: 出面表確定データ
CREATE TABLE dezura_records (
  id SERIAL PRIMARY KEY,
  record_date DATE NOT NULL,
  site_id INT NOT NULL REFERENCES sites(id),
  assignment_id INT REFERENCES assignments(id),
  daily_report_id INT REFERENCES daily_reports(id),
  check_status TEXT NOT NULL DEFAULT '未提出' CHECK (check_status IN ('未提出', 'ピンク', '確定')),
  checker1_id UUID,
  checker1_at TIMESTAMPTZ,
  checker2_id UUID,
  checker2_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX idx_dezura_date ON dezura_records(record_date);

-- N1: 変更通知の確認状態
CREATE TABLE assignment_change_notifications (
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
CREATE INDEX idx_change_notifications_worker_date ON assignment_change_notifications(worker_id, target_date);

-- A1: 月次出勤集計
CREATE TABLE attendance_monthly (
  id SERIAL PRIMARY KEY,
  worker_id INT NOT NULL REFERENCES workers(id),
  year_month INT NOT NULL,
  required_work_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  days_day_shift DECIMAL(4,1) NOT NULL DEFAULT 0,
  days_night_only DECIMAL(4,1) NOT NULL DEFAULT 0,
  days_night_through DECIMAL(4,1) NOT NULL DEFAULT 0,
  total_hours DECIMAL(6,1) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
  overtime_fixed DECIMAL(5,1) NOT NULL DEFAULT 0,
  overtime_extra DECIMAL(5,1) NOT NULL DEFAULT 0,
  night_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
  holiday_legal INT NOT NULL DEFAULT 0,
  holiday_scheduled INT NOT NULL DEFAULT 0,
  paid_leave INT NOT NULL DEFAULT 0,
  comp_leave INT NOT NULL DEFAULT 0,
  UNIQUE (worker_id, year_month)
);

-- U1: プロフィール（Supabase Auth連携）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id INT REFERENCES workers(id),
  role TEXT NOT NULL DEFAULT '管理者' CHECK (role IN ('管理者', '現場スタッフ', '作業員')),
  display_name VARCHAR(50) NOT NULL,
  line_user_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- トリガー: 新規ユーザー登録時にprofilesを自動作成
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), '管理者');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS（Row Level Security）
-- ============================================
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dezura_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_change_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 管理者・現場スタッフ: 全テーブルにフルアクセス
CREATE POLICY "admin_staff_workers" ON workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_sites" ON sites FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_companies" ON companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_partners" ON partner_companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_locations" ON location_types FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_categories" ON work_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_calendar" ON company_calendar FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_assignments" ON assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_assignment_workers" ON assignment_workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_assignment_partners" ON assignment_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_assignment_locations" ON assignment_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_daily_reports" ON daily_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_report_workers" ON report_workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_report_categories" ON report_work_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_report_partners" ON report_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_signatures" ON signatures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_dezura" ON dezura_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_change_notifications" ON assignment_change_notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_staff_attendance" ON attendance_monthly FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));

-- profiles
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = '管理者'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = '管理者'));

-- 作業員: assignment_workers の confirmed のみ更新可
CREATE POLICY "worker_confirm" ON assignment_workers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN workers w ON w.id = p.worker_id
    WHERE p.id = auth.uid()
    AND p.role = '作業員'
    AND assignment_workers.worker_id = w.id
  ));

SELECT 'スキーマ作成完了' as result;
