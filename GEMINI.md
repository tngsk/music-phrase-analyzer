# Project Rules: music-phrase-analyzer

## 1. Git & Jules Execution Rules
- **VCS & Git Operations**:
  - `git commit`, `git push`, `git fetch`, `git pull`, `git checkout`, `git apply`, `jules remote pull` などのGit/VCS操作を実行する際は、サンドボックスによる `.git/index.lock` や `~/.gitignore_global` のアクセス拒否（`Operation not permitted`）を回避するため、適切な実行権限（BypassSandbox）で一括実行すること。
- **No Manual File Re-creation (アンチパターンの厳禁)**:
  - Jules や Git の差分（diff / patch）を取り込む際に、差分テキストを読み取ってファイルを1つずつ手動で再生成（個別ファイル書き込み）してはならない。必ず `jules remote pull --session <sessionId> --apply` で一発マージすること。
- **Contract-First Development**:
  - バックエンドとフロントエンドを分離して開発する際は、必ず Pydantic スキーマ（`schemas.py`）や TypeScript 型定義（`types/`）を先にコミットしてからタスクを開始すること。
- **Jules Orchestration**:
  - Jules へのタスク発注時は、`.agents/skills/jules-orchestrator/SKILL.md` に従い、マイクロタスク分割と並列ディスパッチを活用すること。

## 2. Privacy & Hybrid LLM Execution Policy
- **Local LLM Boundary (Apple M2)**:
  - ローカルLLM（Ollama等）は速度目的ではなく、**「機密情報・個人情報・未発表/著作権音源データ・プライバシー保護（サニタイズ/マスキング）」** に限定して使用すること。
  - 機密性の高い楽曲分析ノート生成や個人情報を含むデータの要約は、外部クラウドに送信せずローカルLLMで完結させること。
- **Cloud LLM / Agent Boundary (Jules & Antigravity)**:
  - 一般のソースコード実装、リファクタリング、UI構築、単体・E2Eテスト検証など、計算量・速度・網羅性が求められる開発作業はクラウドエージェント（Jules / Antigravity）に委託すること。
  - クラウドへタスクを発注する際は、機密情報やPIIが含まれていないことを確認し、必要に応じてローカルで事前マスキングを行うこと。
