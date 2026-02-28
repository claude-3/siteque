---
name: Database Rules
description: Supabase、RLS、各テーブルのスキーマ戦略のルール
---

# Database Schema Strategy

- **Database**: Supabase (PostgreSQL)
  - RLS (Row Level Security): 必須。`user_id` に基づくアクセス制御を徹底する。

### `sitecue_notes`

- メモのメインテーブル。`user_id` (Auth, **ON DELETE CASCADE**), `content` などを保持。
- `scope`: `'domain'` | `'exact'` (Check Constraint)
- `note_type`: `'info'` | `'alert'` | `'idea'` (Check Constraint, Default: 'info')
- `is_resolved`: `boolean` (Default: `false`)
- `is_pinned`: `boolean` (Default: `false`)
  - **Local Context**: そのページ（URL）に関連する重要なメモとして、リスト最上位に固定表示する。
- `is_favorite`: `boolean` (Default: `false`)
  - **Global Context**: どのページを開いていても参照できるよう、専用の「Favorites」セクションに常時表示する。
- `url_pattern`:
  - **Normalization Rules**:
    - Protocol (`https://`, `http://`) は必ず除去する。
    - **Scope = 'domain'**: Hostnameのみ保存する (例: `github.com`)。
    - **Scope = 'exact'**: Hostname + Path + Queryを保存する (例: `github.com/user/repo?q=1`)。
- **Migrations**: DB変更は必ず `supabase/migrations` 内のSQLファイルで行うこと。

### `sitecue_profiles`

- ユーザーのプランと利用制限を管理するテーブル。
- `id`: uuid (FK to `auth.users.id`, **ON DELETE CASCADE**) - RLS必須
- `plan`: `'free'` | `'pro'` (Default: `'free'`)
- **Access Control & Triggers**:
  - `handle_new_user`: 新規ユーザー登録時に自動で `free` プランのレコードを作成する。
  - `check_note_limit`: `sitecue_notes` への INSERT 時に発火し、ユーザーの `plan` が `'free'` かつメモ件数が200件以上の場合は例外（エラー）を投げて保存をブロックする。

### `sitecue_domain_settings`

- ドメインごとの環境設定（ラベル・色）を保持。
- `user_id`: uuid (FK) - RLS必須
- `domain`: text (Unique per user)
- `label`: text (例: 'DEV', 'PROD')
- `color`: text (例: 'red', 'blue' - Tailwindクラス用マッピングキー)

### `sitecue_links`

- ドメインごとの「Quick Links」（関連リンク・環境切り替え）を保持するテーブル。
- `user_id`: uuid (FK) - RLS必須
- `domain`: text (リンクを表示する元のドメイン。ポート番号を含む `host` 形式。例: `localhost:3000`)
- `target_url`: text (遷移先のURL)
- `label`: text (リンクの表示名)
- `type`: `'related'` | `'env'` (Check Constraint)
  - `'related'`: 関連リンク。別タブ (`target="_blank"`) で開く。
  - `'env'`: 環境切り替えリンク。現在のタブで開き、パス (`pathname` + `search`) を維持してドメインのみ差し替える。
