---
name: jules-orchestrator
description: >-
  Orchestrates task breakdown, parallel dispatch, monitoring, and clean git pull integration for Google Jules AI coding agent sessions.
  Use whenever planning large features, breaking down monolithic tasks into parallel microtasks, dispatching coding tasks to Jules,
  debugging Jules integration bottlenecks, or pulling and merging Jules session outputs.
---

# Jules Orchestrator Skill

This skill guides the agent in orchestrating development tasks with **Google Jules**, utilizing microtask decomposition, parallel dispatch, contract-first design, privacy-preserving hybrid execution, and clean Git pull/merge workflows.

---

## 🧭 Core Principles

1. **Contract-First (型・インターフェース先行定義)**:
   - バックエンドとフロントエンドを分割する前に、Pydanticモデル（`schemas.py`）や TypeScript型（`types/*.ts`）、API仕様を先にコミットしておく。
2. **Microtask Decomposition (マイクロタスク分割)**:
   - 1つのセッションにフルスタックすべてを一括発注（Monolithic）せず、独立した関心事（ドメインロジック、ルーター、UI、エクスポート等）に分割する。
3. **Privacy & Hybrid LLM Boundary (プライバシー境界の遵守)**:
   - Apple M2 上のローカルLLMは **機密情報・個人情報・未発表/著作権音源データ・サニタイズ処理** に限定して使用する。
   - クラウド（Jules）には高速なコード実装、UI、テスト作成を委託し、機密情報が含まれる場合はローカルで事前マスキングを行う。
4. **High Context Purity (コンテキスト純度)**:
   - 各Julesセッションには、そのタスクに関連する2〜4ファイルと単体テストのみに集中させることで、コード消失やデバッグ迷走を防ぐ。
5. **Clean Integration & Never Manual File-by-File Copying (パッチの安全な一括取り込み)**:
   - Julesセッション完了時の成果物取り込みは、**手動で個別ファイルを1つずつ再作成してはならない（アンチパターン）**。
   - 必ず `jules remote pull <sessionId>` または一括パッチ適用（`git apply`）を用いる。

---

## 🛠 Step-by-Step Workflow

### Step 1: 要件分析とタスク分割 (Decomposition)
大きな要件を以下の独立したスライスに分割する：

| スライス | 担当範囲 | 依存・事前準備 |
|---|---|---|
| **Slice A: Core Engine** | 解析サービス、アルゴリズム、ビジネスロジック ＋ pytest | 入出力データ構造のみ |
| **Slice B: API Layer** | FastAPIルーター、バリデーション、ストレージ管理 | Slice Aのモック/インターフェース |
| **Slice C: Frontend UI** | React/Vueコンポーネント、状態管理、スタイル | APIモックJSON |
| **Slice D: Exporter / CLI** | レポート生成、外部フォーマット出力、スクリプト | 共通データ型 |

### Step 2: プライバシーチェック & 共通インターフェースの先行コミット
1. **プライバシー検証**: 発注内容に機密情報（APIキー、個人情報、未公開音源メタデータ）が含まれていないことを確認。
2. **型定義先行プッシュ**:
   - `backend/app/schemas.py` または `docs/SPECIFICATION.md`
   - `frontend/src/types/`

### Step 3: Jules への並列発注 (Parallel Dispatch)
Jules MCP (`jules_start_session`) または CLI (`jules remote new`) を使用して、各スライスを独立したプロンプトで発注する。

#### 発注プロンプトのテンプレート:
```markdown
# Objective: Implement [Specific Feature / Component]

## Context & References
- Target Files: `path/to/target1.py`, `path/to/target2.py`
- Contract / Specification: See `docs/SPECIFICATION.md` and `schemas.py`

## Requirements
1. Implement [Functionality] conforming exactly to the defined types.
2. Add unit tests in `tests/test_[module].py`.
3. Ensure `pytest` passes cleanly.
```

### Step 4: 進行中のトラブルシューティング支援
Julesが問い合わせ（500エラーやタイムアウトなど）をしてきた場合：
- **Uvicorn / Python Traceback の確認**: 例外名と発生行を特定させる。
- **Payload & CORS の不整合解消**: `FormData` vs `JSON`、`allow_origins` と `allow_credentials` の競合を是正する。
- **E2Eタイムアウトの調整**: 重い処理に対する適切なポーリング待機処理を指示する。

### Step 5: 成果物の取り込み (Pull & Merge)

> [!CAUTION]
> **アンチパターン禁止**:
> `jules_pull_session` の diff 出力を読み取って、ローカルに1ファイルずつ手動で `write_to_file` してはならない。

#### 正しい取り込み手順:
1. ユーザーにターミナルでの取り込みコマンドを提示する：
   ```bash
   jules remote pull <sessionId>
   ```
2. または、取得した diff パッチを `git apply` / `git merge` で一括適用する。
3. ローカルでテストおよびビルドを実行し、整合性を検証する：
   ```bash
   pytest
   npm run build
   ```

---

## 📋 チェックリスト
- [ ] 機密情報・著作権音源データがクラウドに流出しない設計になっているか？
- [ ] 結合型定義（Contract）が先にリポジトリに存在するか？
- [ ] 各Julesタスクは独立してテスト可能か？
- [ ] 完了後の成果物取り込みに `jules remote pull` を使用したか？
