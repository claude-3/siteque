# Project: SiteCue

## Overview
SiteCueは、開発者向けの「コンテキスト認識型メモアプリ」です。
Chrome拡張機能として動作し、現在開いているURLやドメインに紐付いたメモを表示します。

## Architecture
- **Extension**: React + Vite + Tailwind CSS (Chrome Extension Manifest V3)
  - Path: `extension/`
  - Main Logic: Supabaseクライアントを直接使用してDBと通信。
- **Web**: Next.js (App Router)
  - Path: `web/`
- **Database**: Supabase (PostgreSQL)
  - RLS (Row Level Security): 必須。`user_id` に基づくアクセス制御を徹底。

## Database Schema Strategy
- **sitecue_notes**: メモのメインテーブル。`user_id` (Auth), `url_pattern`, `content`, `scope` などを持つ。
- **Migrations**: DB変更は必ず `supabase/migrations` 内のSQLファイルで行うこと。

## Development Guidelines
1. **Atomic Design**: 機能追加は小さく分割し、1機能1コミットを心がける。
2. **Security First**: データベース操作は必ずRLSポリシーを介して行う。
3. **Context Awareness**: `extension/` と `web/` は異なる環境であることを意識し、混同しない。
4. **Documentation**: 新規テーブルや主要なロジック変更があった際は、このファイルではなくコード内のコメントや別途ドキュメントを更新する。

## Prompt Strategy
- 各タスクの詳細は、都度与えられるプロンプトまたはGitHub Issueの記述に従うこと。