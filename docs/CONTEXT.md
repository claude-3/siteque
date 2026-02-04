# Project: SiteCue

## Overview
SiteCueは、開発者向けの「コンテキスト認識型メモアプリ」です。
Chrome拡張機能として動作し、現在開いているURLやドメインに紐付いたメモを表示します。

## Architecture
- **Extension**: React + Vite + Tailwind CSS (Chrome Extension Manifest V3)
  - Path: `extension/`
  - **Communication Pattern**: Supabase JS Client (`@supabase/supabase-js`) を使用して **DBと直接通信する**。
  - ⛔ **Prohibited**: `extension/` から `api/` (Cloudflare Workers) を経由してCRUDを行ってはならない。`axios` や `fetch` でバックエンドを叩くのは禁止。
- **Web**: Next.js (App Router)
  - Path: `web/`
- **Database**: Supabase (PostgreSQL)
  - RLS (Row Level Security): 必須。`user_id` に基づくアクセス制御を徹底する。

## Database Schema Strategy
### `sitecue_notes`
- メモのメインテーブル。`user_id` (Auth), `content` などを保持。
- `scope`: `'domain'` | `'exact'` (Check Constraint)
- `note_type`: `'info'` | `'alert'` | `'idea'` (Check Constraint, Default: 'info')
- `is_resolved`: `boolean` (Default: `false`)
- `url_pattern`:
  - **Normalization Rules**:
    - Protocol (`https://`, `http://`) は必ず除去する。
    - **Scope = 'domain'**: Hostnameのみ保存する (例: `github.com`)。
    - **Scope = 'exact'**: Hostname + Path + Queryを保存する (例: `github.com/user/repo?q=1`)。
- **Migrations**: DB変更は必ず `supabase/migrations` 内のSQLファイルで行うこと。

### `sitecue_domain_settings`
- ドメインごとの環境設定（ラベル・色）を保持。
- `user_id`: uuid (FK) - RLS必須
- `domain`: text (Unique per user)
- `label`: text (例: 'DEV', 'PROD')
- `color`: text (例: 'red', 'blue' - Tailwindクラス用マッピングキー)


## Development Guidelines
1. **Atomic Design**: 機能追加は小さく分割し、1機能1コミットを心がける。
2. **Security First**: データベース操作は必ずRLSポリシーを介して行う。クライアント側でのフィルタリングに依存せず、DBレベルでセキュリティを担保する。
3. **Context Awareness**: `extension/` と `web/` は異なる環境であることを意識し、混同しない。
4. **Extension Context**:
   - 拡張機能内でのデータ再取得（リフェッチ）は、Reactのライフサイクルだけでなく、`chrome.tabs.onUpdated` や `chrome.tabs.onActivated` などのブラウザイベントをトリガーにすること。
   - バックグラウンドでタブが切り替わった際も正しくコンテキストを追従させる必要がある。

## Prompt Strategy
- 各タスクの詳細は、都度与えられるプロンプトまたはGitHub Issueの記述に従うこと。