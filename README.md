# music-phrase-analyzer

> **Demucs ＋ Mirelo (MuScriptor) を中核とした、耳コピ支援 ＆ 楽曲フレーズ分析 Web ツール**

気になったフレーズを波形上で部分指定し、**Demucs** によるステム分離と **Mirelo (MuScriptor)** による Audio-to-MIDI 抽出を実行。さらに **music21 / pretty_midi / librosa** を駆使してメロディ・コード進行・リズム・音色を自動解析し、ピアノロール表示や分析ノート（Markdown）を出力します。

---

## 🌟 主な機能

- **クリップ指定・高速パイプライン**: 楽曲全体ではなく、指定した数小節・数秒のみを高速に切り出して処理。
- **マルチステム MIDI 抽出**: ボーカル、ベース、ドラム、ギター、ピアノなどをパートごとにMIDI化。
- **音楽理論解析 (music21 / pretty_midi)**:
  - **メロディ**: 音域レンジ、ステップ/ジャンプ比率、スケール判定、頻出モチーフ抽出 (n-gram)。
  - **和声・コード進行**: 拍ごとのコード判定、主調に対するローマ数字度数分析、機能和声 (T/S/D)、定番進行パターンマッチ（王道・丸サ・カノンなど）。
- **音響・リズム解析 (librosa)**:
  - **リズム**: テンポ/ビートグリッド推定、クオンタイズスナップ、裏拍/シンコペーション比率、ループ境界推薦。
  - **音色**: スペクトル重心 (Centroid)、アタック/ディケイ特性、MFCC分布、ステム別RMSバランス。
- **インタラクティブ UI (React / Wavesurfer.js)**:
  - 波形・スペクトログラム選択、ピアノロール、コードタイムライン、Web Audio 同期プレビュー。
- **分析ノート・MIDI エクスポート**:
  - 構造化 Markdown レポート自動生成、MIDIファイルダウンロード。

---

## 🏗 アーキテクチャ

詳細な仕様および設計については [docs/SPECIFICATION.md](docs/SPECIFICATION.md) を参照してください。

```text
music-phrase-analyzer/
├── docs/                   # 仕様書・設計ドキュメント
├── backend/                # FastAPI (Python 3.10+) バックエンド
│   ├── app/
│   │   ├── routers/        # API ルーター (upload, analyze, export)
│   │   └── services/       # Demucs, Mirelo, music21, librosa 解析サービス群
│   └── requirements.txt
└── frontend/               # React + Vite + TypeScript フロントエンド
    ├── src/
    │   ├── components/     # 波形セレクタ, ピアノロール, コードタイムライン等
    │   └── services/       # API クライアント
    └── package.json
```

---

## 🚀 クイックスタート

### バックエンドのセットアップ
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### フロントエンドのセットアップ
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 ライセンス
MIT License
