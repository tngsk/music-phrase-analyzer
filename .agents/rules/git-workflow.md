# Git & Jules Workflow Rules

## Execution Guidelines
1. **Git / VCS Permissions**:
   - Git operations modifying `.git` metadata (`commit`, `pull`, `fetch`, `checkout`, `apply`) and `jules remote pull` must be executed with bypass permissions to prevent `Operation not permitted` errors on `.git/index.lock` or `~/.gitignore_global`.
2. **Never Recreate Files from Diffs**:
   - Do NOT parse diff patches line-by-line to manually create individual files using `write_to_file`. Always use `jules remote pull <sessionId>` or `git apply <patch>` to perform clean, atomic merges.
3. **Keep Commits Clean & Atomic**:
   - Group related changes into logical commits with conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`).
