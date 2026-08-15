---
name: jules-orchestrator
description: >-
  Orchestrates task breakdown, parallel dispatch, monitoring, and clean git pull integration for Google Jules AI coding agent sessions.
  Use whenever planning large features, breaking down monolithic tasks into parallel microtasks, dispatching coding tasks to Jules,
  debugging Jules integration bottlenecks, or pulling and merging Jules session outputs.
---

# Jules Orchestrator Skill

This skill guides the agent in orchestrating development tasks with **Google Jules**, leveraging a **Three-Tier Hybrid Architecture (Flash ⚡️ × Pro 🤖 × Local M2 🛡)**, strict microtask decomposition, contract-first design, **Fail-Fast quality assurance (No Silent Fallbacks)**, autonomous execution guardrails, and real dataflow integration tests.

---

## 🏛 1. Three-Tier Hybrid Architecture (モデル特性に応じた役割分担)

| レイヤー | 実行エンジン / モデル | 主な責務・得意領域 |
|---|---|---|
| **L1: Orchestrator** | **Gemini 3.7 Flash** (Antigravity) | リアルタイム設計、Contract先行定義（型・スキーマ）、タスク裁断・並列ディスパッチ、バグ原因の瞬時特定（Fast Triage）、一括統合マージ、E2E結合テスト検証 |
| **L2: Deep Worker** | **Gemini 3.1 Pro** (Google Jules) | 独立リモートVMでの自律的な実装、深い推論に基づくアルゴリズム構築、テストがパスするまでの自律リトライ・修正ループ |
| **L3: Privacy Gate** | **Local LLM** (Apple Silicon M2 / Ollama) | 機密情報・個人情報・未発表/著作権音源データのマスキング・サニタイズ処理、完全オフラインでの解説・分析ノート生成 |

---

## 🧭 2. Core Principles & Quality Standards

1. **No Silent Fallback (Fail Fast 原則の徹底)**:
   - 外部ツールやアルゴリズムの失敗時に、例外を握りつぶしてダミーデータや元ファイルをそのままコピーする「サイレント・フォールバック」を**全面禁止**する。
   - 失敗時は明確にエラー（`RuntimeError`）を上げ、テストを正しく失敗させること。
2. **Real Dataflow & Integration Testing (実態検証の必須化)**:
   - 「ファイルが存在するか」「ステータス200か」だけでなく、「実際に処理されたデータの中身（音響特徴、ピッチ精度、生成内容）」を検証するアサーションを義務付ける。
   - バックエンド: `FastAPI TestClient` による一気通貫 E2E パイプラインテストの作成。
   - フロントエンド: 親から子への Props 渡し忘れを防ぐ厳格なデータフロー検証。
3. **Contract-First (型・インターフェース先行固定)**:
   - Julesに発注する前に、Pydanticスキーマ（`schemas.py`）や TypeScript型（`types/*.ts`）、API仕様をリポジトリへコミット＆プッシュしておく。
4. **Task Granularity Guidelines (3.1 Pro向け黄金サイズ)**:
   - **スコープ上限**: 1タスクあたり **1〜2モジュール ＋ 1テストファイル**。
   - **変更行数目安**: **100〜300行以内**。
   - **禁止事項**: バックエンド＋フロントエンド＋DBを一度に発注するモノリス発注の禁止。
5. **Clean Integration & Never Manual File-by-File Copying (パッチの一括適用)**:
   - 差分テキストから手動で個別ファイルを作成することは**厳禁（アンチパターン）**。
   - 必ず `jules remote pull --session <sessionId> --apply` で一発適用する。
6. **Fully Autonomous Directive (対話停止・待機ボトルの回避)**:
   - 現行の Jules CLI/MCP にはセッション途中のチャットメッセージをプログラムから取得・返答する API が存在しないため、発注プロンプトに必ず「自律完結指示」を付与して途中で質問待機（`Awaiting Input`）になるのを防ぐ。

---

## 🛠 3. Step-by-Step Workflow

### Step 1: 要件分析とタスク分割 (Decomposition)
大きな要件を以下の独立したスライスに分割する：

| スライス | 担当範囲 | 変更規模 |
|---|---|---|
| **Slice A: Core Engine** | 解析サービス、アルゴリズム、ビジネスロジック ＋ 厳密なpytest | 1〜2ファイル |
| **Slice B: API Layer** | FastAPIルーター、バリデーション、ストレージ管理 ＋ E2Eテスト | 1〜2ファイル |
| **Slice C: Frontend UI** | React/Vueコンポーネント、状態管理、スタイル | 1〜2ファイル |
| **Slice D: Exporter / CLI** | レポート生成、外部フォーマット出力、スクリプト | 1〜2ファイル |

### Step 2: プライバシー検証 ＆ 型定義の先行プッシュ
1. **L3 (Local LLM)**: 必要に応じてPIIや機密情報を事前マスキング。
2. **L1 (Flash)**: 結合型定義（`schemas.py` / `types/*.ts`）をコミット＆プッシュ。

### Step 3: Jules への並列ディスパッチ (Parallel Dispatch)
Jules MCP (`jules_start_session`) または CLI (`jules remote new`) で各スライスを発注する。

#### 発注プロンプトの標準テンプレート:
```markdown
# Objective: Implement [Specific Feature / Component]

## Context & References
- Target Files: `path/to/target1.py`, `path/to/target2.py`
- Contract / Specification: See `docs/SPECIFICATION.md` and `schemas.py`

## Execution Policy: Fully Autonomous (MANDATORY)
- Work fully autonomously without pausing for interactive confirmation, plan approval, or questions.
- If any minor design ambiguity arises, choose the standard industry best practice and proceed with the implementation.

## Requirements
1. Implement [Functionality] conforming exactly to the defined types.
2. DO NOT use silent fallbacks (never catch broad exceptions to return fake/dummy data). Let failures raise proper exceptions (Fail Fast).
3. Add meaningful assertions in `tests/test_[module].py` verifying actual transformed data, not just file existence.

## Self-Verification Requirements (MANDATORY)
- Run `pytest tests/test_[module].py` (or `npm run build`) inside your VM environment.
- Iterate and fix the implementation until all tests pass with exit code 0 before concluding the session.
```

### Step 4: モニタリング ＆ ボトルネック対応 (Monitoring & Triage)

#### ⚠️ 現行 Jules インターフェースの制約とボトルネック
- `jules` CLI / `jules-mcp` では、セッション一覧とステータス（`jules_list_sessions`）は取得できますが、**セッション内部のチャット履歴（途中の質問メッセージ本文）を取得する API や外部から返答するコマンドは未実装**です。

#### 💡 対処・リカバリ手順
1. **ステータス監視**:
   - `jules_list_sessions` を定期確認し、ステータスが `Awaiting Plan Approval` や `Waiting for User` になっているセッションを検出。
2. **ユーザー誘導**:
   - 待機状態になったセッションを検知した場合は、即座に該当の Web UI URL（`https://jules.google.com/session/<sessionId>`）を提示し、人間がブラウザまたはターミナル TUI（`jules`）で返答できるようにナビゲートする。
3. **将来拡張**:
   - Jules MCP に `jules_get_session_transcript` / `jules_send_session_message` が追加され次第、Antigravity（Flash）による完全自動 Fast Triage ループへ移行する。

### Step 5: 成果物の一括取り込み ＆ E2E実機検証
1. ターミナルで一括適用コマンドを実行：
   ```bash
   jules remote pull --session <sessionId> --apply
   ```
2. ローカルでE2E結合テストおよびビルドを実行し、整合性を検証する：
   ```bash
   pytest
   npm run build
   ```

---

## 📋 チェックリスト
- [ ] 例外を握りつぶすサイレント・フォールバックが存在しないか？（Fail Fast）
- [ ] 単体・結合テストが「ファイル存在」ではなく「実データの中身」をアサートしているか？
- [ ] 結合型定義（Contract）がリポジトリに先行プッシュされているか？
- [ ] 発注プロンプトに「自律完結指示（Fully Autonomous Directive）」を含めたか？
- [ ] 1タスクあたりのスコープが「1〜2モジュール＋テスト（100〜300行）」に収まっているか？
- [ ] 取り込みに `jules remote pull --session <id> --apply` を使用したか？
