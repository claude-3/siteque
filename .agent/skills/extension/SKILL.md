---
name: Extension Rules
description: Extensionのアーキテクチャ、権限戦略、Markdownレンダリング、Auth戦略のルール
---

# Extension Architecture & Rules

- **Extension**: React + Vite + Tailwind CSS (Chrome Extension Manifest V3)
  - Path: `extension/`
  - **Key Libraries**:
    - `react-textarea-autosize`: テキスト入力の自動伸長に使用。
    - `lucide-react`: アイコン表示に使用。
  - **Communication Pattern**: Supabase JS Client (`@supabase/supabase-js`) を使用して **DBと直接通信する**。
  - ⛔ **Prohibited**: `extension/` から `api/` (Cloudflare Workers) を経由してCRUDを行ってはならない。`axios` や `fetch` でバックエンドを叩くのは禁止。
  - ⚙️ **Manifest Configuration (開発/本番の動的切り替え)**:
    - ローカル開発中の誤操作を防ぐため、`vite.config.ts` にて拡張機能の名称（`[DEV] sitecue`）や開発用アイコンへの差し替えを動的に行っています。
    - 拡張機能のメタデータ（アイコンや名称など）を変更・追加する際は、静的な `manifest.json` だけでなく、`vite.config.ts` 内の動的生成ロジックとの整合性も意識してください。
  - 🛡️ **Permissions Strategy (権限戦略 - 引き算の美学)**:
    - 拡張機能の `manifest.json` における権限要求は極限まで最小化し、ユーザーのインストール時に不要な警戒感（「〇〇上にある自分のデータの読み取りと変更」等）を与えないことを徹底する。
    - 外部API（Supabase等）との通信は、原則として `host_permissions` を使用せず、サーバー側の **CORS設定** で拡張機能IDを許可することで通信を行うこと。
    - ローカル開発用のURL（`http://localhost/*`, `http://127.0.0.1/*`）は開発体験（DX）維持のためソースコードの `manifest.json` の `host_permissions` に残し、Viteのビルドプロセス（`vite.config.ts`）にて本番ビルド時（`command === 'build'`）にのみ自動除外する仕組みを維持すること。

## Markdown Rendering Rules

- 拡張機能の「軽快さ」を死守するため、バンドルサイズを肥大化させる重いライブラリの使用を固く禁ずる。
- **Text Rendering**: `react-markdown` を使用。
  - プラグイン: `remark-breaks` (改行反映), `remark-gfm` (タスクリスト等のGFM対応)。
- **Syntax Highlighting**: `react-syntax-highlighter` を使用。
  - **重要**: 全言語バンドル（`Prism`）のインポートは厳禁。必ず `PrismLight` を使用し、必要な主要言語（js, ts, jsx, tsx, python, sql, bash, json, yaml, toml, html, css, diff, markdown）のみを個別に `registerLanguage` して使用すること。

## Authentication Strategy

- **Provider**: Supabase Auth
- **Methods**: OAuth (Google, GitHub) ※Email/Passwordは廃止済み
- **Extension Constraints (重要)**:
  - Chrome拡張機能（SidePanel等）内では通常のリダイレクトによるOAuthフローが機能しない。
  - そのため、ソーシャルログインの実装・改修を行う際は、必ず `chrome.identity.launchWebAuthFlow` を使用すること。
  - Supabaseの `signInWithOAuth()` を呼び出す際は、`options.redirectTo` に `chrome.identity.getRedirectURL()` で動的に取得したURL（`https://<app-id>.chromiumapp.org/`）を必ず指定し、PKCEフローで認証を完了させること。
  - **アカウント選択の強制**: Googleログイン時は必ず `options: { queryParams: { prompt: 'select_account' } }` を付与し、意図しないアカウントでの自動ログインを防ぐこと。
