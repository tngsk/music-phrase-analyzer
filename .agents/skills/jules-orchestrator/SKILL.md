---
name: jules-orchestrator
description: >-
  Orchestrates task breakdown, parallel dispatch, monitoring, and clean git pull integration for Google Jules AI coding agent sessions.
  Use whenever planning large features, breaking down monolithic tasks into parallel microtasks, dispatching coding tasks to Jules,
  debugging Jules integration bottlenecks, or pulling and merging Jules session outputs.
---

# Jules Orchestrator Skill

This skill guides the agent in orchestrating development tasks with **Google Jules**, leveraging a **Three-Tier Hybrid Architecture (Flash ⚡️ × Pro 🤖 × Local M2 🛡)**, strict microtask decomposition, contract-first design, self-verifying test loops, and clean Git integration.

---

## 🏛 1. Three-Tier Hybrid Architecture (モデル特性に応じた役割分担)

| レイヤー | 実行エンジン / モデル | 主な責務・得意領域 |
|---|---|---|
| **L1: Orchestrator** | **Gemini 3.7 Flash** (Antigravity) | リアルタイム設計、Contract先行定義（型・スキーマ）、タスク裁断・並列ディスパッチ、バグ原因の瞬時特定（Fast Triage）、一括統合マージ |
| **L2: Deep Worker** | **Gemini 3.1 Pro** (Google Jules) | 独立リモートVMでの自律的な実装、深い推論に基づくアルゴリズム構築、テストがパスするまでの自律リトライ・修正ループ |
| **L3: Privacy Gate** | **Local LLM** (Apple Silicon M2 / Ollama) | 機密情報・個人情報・未発表/著作権音源データのマスキング・サニタイズ処理、完全オフラインでの解説・分析ノート生成 |

---

## 🧭 2. Core Principles & Granularity Standards

1. **Contract-First (型・インターフェース先行固定)**:
   - Julesに発注する前に、Pydanticスキーマ（`schemas.py`）や TypeScript型（`types/*.ts`）、API仕様をリポジトリへコミット＆プッシュしておく。
2. **Task Granularity Guidelines (3.1 Pro向け黄金サイズ)**:
   - **スコープ上限**: 1タスクあたり **1〜2モジュール ＋ 1テストファイル**。
   - **変更行数目安**: **100〜300行以内**。
   - **禁止事項**: バックエンド＋フロントエンド＋DBを一度に発注するモノリス発注の禁止。
3. **Self-Verifying Test Loops (自律テストループの必須化)**:
   - 発注プロンプトには、Jules自身がリモートVM内で実行すべき「合否判定コマンド」（`pytest` や `npm run build`）を必ず明記する。
4. **Clean Integration & Never Manual File-by-File Copying (パッチの一括適用)**:
   - 差分テキストから手動で個別ファイルを作成することは**厳禁（アンチパターン）**。
   - 必ず `jules remote pull --session <sessionId> --apply` で一発適用する。

---

## 🛠 3. Step-by-Step Workflow

### Step 1: 要件分析とタスク分割 (Decomposition)
大きな要件を以下の独立したスライスに分割する：

| スライス | 担当範囲 | 変更規模 |
|---|---|---|
| **Slice A: Core Engine** | 解析サービス、アルゴリズム、ビジネスロジック ＋ pytest | 1〜2ファイル |
| **Slice B: API Layer** | FastAPIルーター、バリデーション、ストレージ管理 | 1〜2ファイル |
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

## Requirements
1. Implement [Functionality] conforming exactly to the defined types.
2. Add unit tests in `tests/test_[module].py`.

## Self-Verification Requirements (MANDATORY)
- Run `pytest tests/test_[module].py` (or `npm run build`) inside your VM environment.
- Iterate and fix the implementation until all tests pass with exit code 0 before concluding the session.
```

### Step 4: Fast Triage & サポート
Jules が質問やエラーで停止した場合、L1 (Flash) は瞬時に以下を提示して自律ループに復帰させる：
- **Tracebackの特定**: 例外名と発生行。
- **不整合の解消**: CORS競合（`allow_credentials` vs `allow_origins`）、FormData vs JSON、モック戻り。

### Step 5: 成果物の一括取り込み (Pull & Merge)
1. ターミナルで一括適用コマンドを実行：
   ```bash
   jules remote pull --session <sessionId> --apply
   ```
2. ローカルで検証コマンドを実行：
   ```bash
   pytest
   npm run build
   ```

---

## 📋 チェックリスト
- [ ] 機密情報がローカル境界（L3）で保護されているか？
- [ ] 結合型定義（Contract）がリポジトリに先行プッシュされているか？
- [ ] 1タスクあたりのスコープが「1〜2モジュール＋テスト（100〜300行）」に収まっているか？
- [ ] 発注プロンプトに自律合否判定コマンド（`Self-Verification`）が含まれているか？
- [ ] 取り込みに `jules remote pull --session <id> --apply` を使用したか？
