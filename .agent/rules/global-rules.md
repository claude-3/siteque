# Project: SiteCue

# 🚨 開発ルールの絶対遵守事項 (CRITICAL: PACKAGE MANAGER)

- 本プロジェクトのパッケージマネージャーは **Bun** です。
- **絶対に `npm`, `yarn`, `pnpm` を使用しないでください。**
- パッケージの追加、インストール、スクリプトの実行は、必ず `bun add`, `bun install`, `bun run` を使用してください。
- （AIエディタへ）自動コマンド提案で `npm install` や `npm run build` を提示することは固く禁じます。

## Overview

SiteCueは、開発者向けの「コンテキスト認識型メモアプリ」です。
Chrome拡張機能として動作し、現在開いているURLやドメインに紐付いたメモを表示します。将来的な収益化を見据え、無料ユーザーには一定の制限を設けています。

## Architecture Overview

- **Extension**: React + Vite + Tailwind CSS (Chrome Extension Manifest V3) (Path: `extension/`)
- **Web**: Next.js (App Router) (Path: `web/`)
- **Database**: Supabase (PostgreSQL)

## UI/UX Design Principles (引き算の美学)

- **ノイズ除去**: 不要な情報や余白は徹底的に排除する（例：Domain Settingsが未設定の場合は、不自然な空白を作らず左詰めにし、不要なDOMはレンダリングしない）。
- **ユーザーコントロール**: 設定した項目は、常に「解除（設定しない）」状態に戻せるようにする。
- **通知UIの最適化 (Feedback & Noise Reduction)**:
  - ユーザーの操作結果が、画面UIの変化（リストへのアイテム追加など）で明白に伝わる場合、トースト通知などの視覚的ノイズは追加しない。
  - 現在の画面に変化が現れない操作（例: Inboxなど別コンテキストへのバックグラウンド保存）の場合のみ、控えめな成功通知を表示する。
  - エラー発生時は確実にトースト通知等でフィードバックを行い、ユーザーが入力中のデータは絶対に破棄・クリアしないこと。
