# kodera_kanri プロジェクト初期化指示書

**このドキュメントはClaude Codeでプロジェクトをセットアップするための指示書です。**

---

## プロジェクト概要

小寺工務店の業務管理Webシステム。建設現場の人員配置・日報・出面表・出勤表をデジタル化する。

## ディレクトリ

```
~/APP/kodera_kanri/
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| DB / Auth / Storage | Supabase |
| デプロイ | Vercel |
| LINE連携 | LINE Messaging API |
| PWA | next-pwa |

## セットアップ手順

### 1. プロジェクト作成

```bash
cd ~/APP
npx create-next-app@latest kodera_kanri --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd kodera_kanri
```

### 2. 依存パッケージインストール

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @supabase/auth-helpers-nextjs
npx shadcn@latest init
npx shadcn@latest add button input select table card badge tabs dialog sheet toast dropdown-menu separator label textarea
npm install lucide-react
npm install date-fns
```

### 3. 環境変数ファイル

`.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
```

### 4. ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # ログイン画面
│   ├── (dashboard)/
│   │   ├── layout.tsx                # PCタブナビゲーション
│   │   ├── sites/
│   │   │   └── page.tsx              # 現場一覧
│   │   ├── dezura/
│   │   │   └── page.tsx              # 出面表
│   │   ├── attendance/
│   │   │   └── page.tsx              # 出勤表
│   │   ├── master/
│   │   │   └── page.tsx              # マスタ設定
│   │   └── mypage/
│   │       └── page.tsx              # マイページ
│   ├── (mobile)/
│   │   ├── layout.tsx                # スマホレイアウト
│   │   ├── haichi/
│   │   │   └── page.tsx              # 配置入力（白籏さん）
│   │   ├── nippo/
│   │   │   └── page.tsx              # 日報入力（職長）
│   │   └── sign/
│   │       └── page.tsx              # 手書きサイン
│   ├── api/
│   │   ├── line/
│   │   │   └── webhook/
│   │   │       └── route.ts          # LINE Webhook受信
│   │   └── cron/
│   │       └── remind/
│   │           └── route.ts          # リマインド通知
│   ├── layout.tsx
│   └── page.tsx                      # ルート（ログイン状態でリダイレクト）
├── components/
│   ├── ui/                           # shadcn/ui コンポーネント
│   ├── haichi/                       # 配置入力関連
│   │   ├── site-card.tsx             # 現場カード
│   │   ├── worker-pill.tsx           # 作業員ピル
│   │   ├── partner-counter.tsx       # 協力会社 +/- カウンター
│   │   ├── add-site-modal.tsx        # 現場追加モーダル
│   │   ├── date-nav.tsx              # 日付ナビゲーション
│   │   └── summary-bar.tsx           # サマリーバー
│   ├── nippo/                        # 日報入力関連
│   │   ├── report-form.tsx           # 日報フォーム
│   │   ├── overtime-row.tsx          # 残業者行
│   │   ├── partner-overtime.tsx      # 協力会社残業（2行構成）
│   │   └── sign-canvas.tsx           # 手書きサインCanvas
│   ├── dezura/                       # 出面表関連
│   │   └── dezura-table.tsx          # 出面表テーブル
│   ├── attendance/                   # 出勤表関連
│   │   └── attendance-detail.tsx     # 個人詳細
│   ├── sites/                        # 現場一覧関連
│   │   ├── site-list-table.tsx       # 現場テーブル
│   │   └── site-detail-panel.tsx     # 現場詳細パネル
│   ├── layout/
│   │   ├── tab-navigation.tsx        # PCタブナビ
│   │   └── mobile-header.tsx         # スマホヘッダー
│   └── shared/
│       └── status-badge.tsx          # ステータスバッジ
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # ブラウザ用Supabaseクライアント
│   │   ├── server.ts                 # サーバー用Supabaseクライアント
│   │   └── middleware.ts             # 認証ミドルウェア
│   ├── line/
│   │   ├── messaging.ts             # LINE メッセージ送信
│   │   └── flex-templates.ts        # Flex Message テンプレート
│   └── utils/
│       ├── overtime-calc.ts          # 残業計算ロジック
│       └── night-shift-calc.ts       # 夜勤計算ロジック
├── hooks/
│   ├── use-assignments.ts            # 配置データ取得
│   ├── use-daily-reports.ts          # 日報データ取得
│   └── use-sites.ts                  # 現場データ取得
├── types/
│   └── database.ts                   # Supabase型定義（自動生成）
└── middleware.ts                     # Next.js ミドルウェア（認証チェック）
```

## Supabase テーブル定義（SQL）

以下のSQLをSupabase SQL Editorで実行してテーブルを作成する。

```sql
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

-- M2: 現場マスター
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  construction_number VARCHAR(20),
  client_company_id INT NOT NULL,
  payer_company_id INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT '稼働中' CHECK (status IN ('稼働中', '完了')),
  default_contract_type TEXT CHECK (default_contract_type IN ('常用', '請負')),
  memo TEXT,
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

-- FK追加
ALTER TABLE sites ADD CONSTRAINT fk_sites_client FOREIGN KEY (client_company_id) REFERENCES companies(id);
ALTER TABLE sites ADD CONSTRAINT fk_sites_payer FOREIGN KEY (payer_company_id) REFERENCES companies(id);

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
  shift_type TEXT NOT NULL CHECK (shift_type IN ('日勤のみ', '通し夜勤', '夜勤のみ')),
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
  shift TEXT NOT NULL CHECK (shift IN ('日勤', '夜勤')),
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
  overtime_hours DECIMAL(3,1)
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
  role TEXT NOT NULL DEFAULT '作業員' CHECK (role IN ('管理者', '現場スタッフ', '作業員')),
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
ALTER TABLE attendance_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 管理者・現場スタッフ: 全テーブルにフルアクセス
CREATE POLICY "admin_and_staff_full_access" ON workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON sites FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON partner_companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON location_types FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON work_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON company_calendar FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON assignment_workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON assignment_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON assignment_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON daily_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON report_workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON report_work_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON report_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON signatures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON dezura_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));
CREATE POLICY "admin_and_staff_full_access" ON attendance_monthly FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('管理者', '現場スタッフ')));

-- profiles: 自分のレコードは読み取り可。管理者は全員分。
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

-- ============================================
-- 初期データ: 勤務場所区分
-- ============================================
INSERT INTO location_types (name, requires_report, show_in_dezura, display_order) VALUES
  ('東京出張所', FALSE, TRUE, 1),
  ('本社', FALSE, TRUE, 2),
  ('運搬', TRUE, TRUE, 3),
  ('置場', FALSE, TRUE, 4),
  ('外回り', FALSE, TRUE, 5),
  ('休み', FALSE, TRUE, 6),
  ('仮設部月例会議', FALSE, TRUE, 7);

-- 初期データ: 作業内容区分
INSERT INTO work_categories (name, display_order) VALUES
  ('とび', 1),
  ('解体', 2),
  ('サポート土工', 3),
  ('現場管理', 4),
  ('CON', 5),
  ('その他', 6);
```

## 初回のClaude Codeでの実行手順

Claude Codeで以下の順番で進めてください:

1. **プロジェクト作成** — 上記のセットアップ手順を実行
2. **ディレクトリ構成の作成** — 上記のフォルダ構造を作成
3. **Supabase クライアント設定** — `lib/supabase/client.ts` と `server.ts` を作成
4. **認証ミドルウェア** — `middleware.ts` でログインチェック＋ロール判定
5. **PCタブナビゲーション** — `(dashboard)/layout.tsx` に現場一覧/出面表/出勤表/マスタ設定/マイページのタブ
6. **ログイン画面** — Supabase Auth のメール/PW ログイン
7. **現場一覧画面** — 最初に作る画面。CRUD操作でSupabase連携の基盤を確立

## 権限（3ロール）

| ロール | アクセス範囲 |
|--------|-----------|
| 管理者 | 全機能フルアクセス |
| 現場スタッフ | 管理者と同等。ただし打刻のみ不可 |
| 作業員 | Web画面にログインしない。LINEで確認ボタンのみ |

## 参考ドキュメント

同じディレクトリに以下のドキュメントがあります:

- `小寺工務店_要件定義書_v3_詳細版.md` — 全画面・全機能の詳細定義
- `小寺工務店_データモデル定義書_v1.md` — テーブル定義・リレーション・データフロー
