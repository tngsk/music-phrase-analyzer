#!/usr/bin/env bash

# ==============================================================================
# music-phrase-analyzer 起動スクリプト (run.sh)
# バックエンド (FastAPI) とフロントエンド (Vite) を同時に起動します。
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

echo "🎵 Starting music-phrase-analyzer..."

# ------------------------------------------------------------------------------
# 1. バックエンド環境の準備
# ------------------------------------------------------------------------------
if [ ! -d "${BACKEND_DIR}/.venv" ]; then
    echo "📦 Backend virtualenv not found. Creating with uv/python3..."
    if command -v uv >/dev/null 2>&1; then
        uv venv "${BACKEND_DIR}/.venv"
        uv pip install -r "${BACKEND_DIR}/requirements.txt" --python "${BACKEND_DIR}/.venv/bin/python"
    else
        python3 -m venv "${BACKEND_DIR}/.venv"
        "${BACKEND_DIR}/.venv/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"
    fi
fi

# ------------------------------------------------------------------------------
# 2. フロントエンド環境の準備
# ------------------------------------------------------------------------------
if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo "📦 Frontend dependencies not found. Installing with npm..."
    (cd "${FRONTEND_DIR}" && npm install)
fi

# ------------------------------------------------------------------------------
# 3. 終了処理 (Ctrl+C で両プロセスを停止)
# ------------------------------------------------------------------------------
cleanup() {
    echo ""
    echo "🛑 Shutting down music-phrase-analyzer..."
    if [ -n "${BACKEND_PID}" ]; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ]; then
        kill "${FRONTEND_PID}" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 4. バックエンド & フロントエンドの起動
# ------------------------------------------------------------------------------
echo "🚀 Starting Backend (FastAPI on http://127.0.0.1:8000)..."
(
    cd "${BACKEND_DIR}"
    export PYTHONPATH="${BACKEND_DIR}"
    exec "${BACKEND_DIR}/.venv/bin/uvicorn" app.main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "🚀 Starting Frontend (Vite on http://localhost:5173)..."
(
    cd "${FRONTEND_DIR}"
    exec npm run dev -- --host
) &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo "  🎉 music-phrase-analyzer is now running!"
echo "  👉 Frontend: http://localhost:5173"
echo "  👉 Backend API Docs: http://localhost:8000/docs"
echo "  Press Ctrl+C to stop all services."
echo "========================================================"
echo ""

# プロセスの終了を待機
wait
