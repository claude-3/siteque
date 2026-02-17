# Project: SiteCue

## Overview

SiteCueは、開発者向けの「コンテキスト認識型メモアプリ」です。
Chrome拡張機能として動作し、現在開いているURLやドメインに紐付いたメモを表示します。

## UI/UX Design Principles (引き算の美学)

- **ノイズ除去**: 不要な情報や余白は徹底的に排除する（例：Domain Settingsが未設定の場合は、不自然な空白を作らず左詰めにし、不要なDOMはレンダリングしない）。
- **ユーザーコントロール**: 設定した項目は、常に「解除（設定しない）」状態に戻せるようにする。

## Architecture

- **Extension**: React + Vite + Tailwind CSS (Chrome Extension Manifest V3)
  - Path: `extension/`
  - **Key Libraries**:
    - `react-textarea-autosize`: テキスト入力の自動伸長に使用。
    - `lucide-react`: アイコン表示に使用。
  - **Communication Pattern**: Supabase JS Client (`@supabase/supabase-js`) を使用して **DBと直接通信する**。
  - ⛔ **Prohibited**: `extension/` から `api/` (Cloudflare Workers) を経由してCRUDを行ってはならない。`axios` や `fetch` でバックエンドを叩くのは禁止。
- **Web**: Next.js (App Router)
  - Path: `web/`
- **Database**: Supabase (PostgreSQL)
  - RLS (Row Level Security): 必須。`user_id` に基づくアクセス制御を徹底する。

## Markdown Rendering Rules

- 拡張機能の「軽快さ」を死守するため、バンドルサイズを肥大化させる重いライブラリの使用を固く禁ずる。
- **Text Rendering**: `react-markdown` を使用。
  - プラグイン: `remark-breaks` (改行反映), `remark-gfm` (タスクリスト等のGFM対応)。
- **Syntax Highlighting**: `react-syntax-highlighter` を使用。
  - **重要**: 全言語バンドル（`Prism`）のインポートは厳禁。必ず `PrismLight` を使用し、必要な主要言語（js, ts, jsx, tsx, python, sql, bash, json, yaml, toml, html, css, diff, markdown）のみを個別に `registerLanguage` して使用すること。

## Authentication Strategy

- **Provider**: Supabase Auth
- **Methods**: Email/Password, OAuth (Google, GitHub)
- **Extension Constraints (重要)**:
  - Chrome拡張機能（SidePanel等）内では通常のリダイレクトによるOAuthフローが機能しない。
  - そのため、ソーシャルログインの実装・改修を行う際は、必ず `chrome.identity.launchWebAuthFlow` を使用すること。
  - Supabaseの `signInWithOAuth()` を呼び出す際は、`options.redirectTo` に `chrome.identity.getRedirectURL()` で動的に取得したURL（`https://<app-id>.chromiumapp.org/`）を必ず指定し、PKCEフローで認証を完了させること。

## Database Schema Strategy

### `sitecue_notes`

- メモのメインテーブル。`user_id` (Auth), `content` などを保持。
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

## Development Guidelines

1. **Atomic Design**: 機能追加は小さく分割し、1機能1コミットを心がける。
2. **Security First**: データベース操作は必ずRLSポリシーを介して行う。クライアント側でのフィルタリングに依存せず、DBレベルでセキュリティを担保する。
3. **Context Awareness**: `extension/` と `web/` は異なる環境であることを意識し、混同しない。
4. **Extension Context**:
   - 拡張機能内でのデータ再取得（リフェッチ）は、Reactのライフサイクルだけでなく、`chrome.tabs.onUpdated` や `chrome.tabs.onActivated` などのブラウザイベントをトリガーにすること。
   - バックグラウンドでタブが切り替わった際も正しくコンテキストを追従させる必要がある。
5. **Development Workflow & Package Management**:
   - パッケージマネージャーは `bun` を使用。
   - `web`, `extension`, `api` のワークスペース（モノレポ）構成となっているため、依存関係の追加・更新時に `npm` や `pnpm` が裏で動いてロックファイルが競合しないよう注意する。
