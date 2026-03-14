-- 作業員テーブルに配置入力・日報入力の権限フラグを追加
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS can_edit_haichi BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_nippo BOOLEAN NOT NULL DEFAULT false;

-- 既存の現場スタッフは両方trueに設定
UPDATE workers
SET can_edit_haichi = true, can_edit_nippo = true
WHERE system_role = '現場スタッフ';

-- 管理者は常にtrue扱いなのでDBでも true にしておく（アプリ側でも制御）
UPDATE workers
SET can_edit_haichi = true, can_edit_nippo = true
WHERE system_role = '管理者';
