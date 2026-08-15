# Project Rules: music-phrase-analyzer

## 1. Git & Jules Execution Rules
- **VCS & Git Operations**:
  - `git commit`, `git push`, `git fetch`, `git pull`, `git checkout`, `git apply`, `jules remote pull` などのGit/VCS操作を実行する際は、サンドボックスによる `.git/index.lock` や `~/.gitignore_global` のアクセス拒否（`Operation not permitted`）を回避するため、適切な実行権限（BypassSandbox）で一括実行すること。
- **No Manual File Re-creation (アンチパターンの厳禁)**:
  - Jules や Git の差分（diff / patch）を取り込む際に、差分テキストを読み取ってファイルを1つずつ手動で再生成（個別ファイル書き込み）してはならない。必ず `jules remote pull <sessionId>` または一括パッチ適用（`git apply`）で一発マージすること。
- **Contract-First Development**:
  - バックエンドとフロントエンドを分離して開発する際は、必ず Pydantic スキーマ（`schemas.py`）や TypeScript 型定義（`types/`）を先にコミットしてからタスクを開始すること。
- **Jules Orchestration**:
  - Jules へのタスク発注時は、`.agents/skills/jules-orchestrator/SKILL.md` に従い、マイクロタスク分割と並列ディスパッチを活用すること。
