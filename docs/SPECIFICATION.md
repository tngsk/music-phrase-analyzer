# music-phrase-analyzer: 仕様書 & 設計ドキュメント

## 1. プロジェクト概要
**music-phrase-analyzer** は、気になった楽曲フレーズを波形タイムライン上で部分指定（クリップ切り出し）し、**Demucs（ニューラル音源分離）＋ Mirelo (audio-to-MIDI)** を中核としてMIDI抽出し、さらに **music21 / pretty_midi / librosa** を用いて音楽理論（メロディ・コード・スケール）と音響特性（リズム・音色・音圧）を多角的に解析する「耳コピ支援＋楽曲分析ノート作成」Webアプリケーションです。

---

## 2. 開発・品質原則 (Fail-Fast & Quality Assurance)

- **No Silent Fallback (サイレント・フォールバックの全面禁止)**:
  - 外部AIモデル（Demucs）や音楽理論エンジン（music21）の処理失敗時に、例外を握りつぶしてダミーデータや元ファイルをそのままコピーするような「偽装フォールバック」を全面禁止。
  - 失敗時は即座に明確な例外（`RuntimeError`, `HTTPException 500`）を発生させて原因を表面化（Fail Fast）させる。
- **Real Dataflow Integration Testing (実データフロー結合テストの必須化)**:
  - 単体テストではファイル存在確認だけでなく、生成されたデータ（分離された音響特徴、ピッチ精度）の実態をアサートする。
  - バックエンドは `FastAPI TestClient` による `Upload ──► Analyze ──► Export` の一気通貫 E2E パイプラインテストを標準装備。

---

## 3. システム構成・アーキテクチャ

### 3.1 全体パイプライン
1. **ユーザー入力**:
   - 音声ファイル（MP3/WAV/FLAC等）のアップロード（ゼロレイテンシでの波形即時プレビュー）。
   - 波形タイムライン上で解析対象範囲（例: 00:00 - 00:10）をドラッグ選択 ＆ ループ再生試聴。
   - 解析対象ステムの選択（Vocals, Bass, Drums, Other）。
2. **バックエンド処理**:
   - **音声クリップ抽出**: 指定範囲の音声のみを高速トリミング。
   - **ステム分離 (Demucs)**: `htdemucs` モデルによる4ステム（Vocals, Bass, Drums, Other）の実分離。
   - **Audio-to-MIDI (Mirelo / librosa pyin)**: 各ステム音声から動的にMIDIノート系列を生成。
   - **音楽理論解析**:
     - メロディ解析 (`pretty_midi`, `music21`): 音域、ステップ/ジャンプ比率、スケール推定、モチーフ探索。
     - 和声・コード進行解析 (`music21`): 拍ごとのコード判定、ローマ数字度数分析、王道/丸サ/カノン等の定番進行パターンマッチ、機能和声 (T/S/D)。
   - **音響・信号解析 (`librosa`)**:
     - リズム解析: テンポ/ビートグリッド推定、オンセット強度に基づく真のシンコペーション係数算出。
     - 音色解析: スペクトル重心 (Centroid)、アタック特性、MFCC分布、RMSエネルギー。
3. **出力・UI表示**:
   - **Stem Audio Mixer**: 分離された各ステム（Vocals, Bass, Drums, Other）の単体ソロ試聴 ＆ 個別WAV/MIDIダウンロード。
   - **全パート統合 MIDI エクスポート**: 全トラックが1つにまとまったマルチトラックMIDI（`all_stems.mid`）の一括ダウンロード。
   - **インタラクティブ・ピアノロール**: パート別のMIDIノートをSVGで動的描画（音名・ベロシティ・タイミングをツールチップ表示）。
   - **コード進行タイムライン**: 和音ネーム・度数・機能和声のリアルタイム表示。
   - **音楽理論・音響特徴量ダッシュボード**: 理論サマリーの可視化。
   - **分析ノート自動生成**: Markdown レポートプレビュー・ファイル保存。

---

## 4. ディレクトリ構成

```text
music-phrase-analyzer/
├── docs/
│   └── SPECIFICATION.md       # 本仕様書
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI エントリポイント
│   │   ├── config.py          # ストレージ・モデル設定
│   │   ├── schemas.py         # Pydantic Contract スキーマ
│   │   ├── routers/
│   │   │   ├── upload.py      # 音声アップロード
│   │   │   ├── analyze.py     # 解析実行 & ステムメタデータ生成
│   │   │   └── export.py      # ステムWAV / MIDI / レポート配信
│   │   └── services/
│   │       ├── audio_utils.py     # 音声トリミング・正規化
│   │       ├── demucs_worker.py   # Demucsニューラル音源分離 (Fail-Fast)
│   │       ├── mirelo_worker.py   # Audio-to-MIDI ピッチ検出
│   │       ├── analysis_melody.py # メロディ・音域・モチーフ解析
│   │       ├── analysis_harmony.py# 和音・進行パターンマッチ
│   │       ├── analysis_rhythm.py # BPM・ビート・シンコペーション解析
│   │       ├── analysis_timbre.py # 音色・スペクトル・RMS解析
│   │       └── report_gen.py      # Markdownレポート生成
│   ├── tests/
│   │   ├── test_analysis.py       # モジュール単体テスト
│   │   ├── test_mirelo.py         # MIDI生成テスト
│   │   ├── test_match_progression.py # コード進行マッチテスト
│   │   └── test_e2e_pipeline.py   # E2Eパイプライン結合テスト
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── AudioTimeline.tsx     # 波形・ドラッグ範囲選択 (Wavesurfer.js)
│   │   │   ├── StemMixer.tsx         # ステム個別試聴・WAV/MIDIエクスポート
│   │   │   ├── StemSelector.tsx      # ステム選択UI
│   │   │   ├── PianoRoll.tsx         # 動的SVGピアノロール
│   │   │   ├── HarmonyTimeline.tsx   # コード進行タイムライン
│   │   │   ├── TheoryDashboard.tsx   # 音楽理論ダッシュボード
│   │   │   ├── PlayerControls.tsx    # 全パート統合MIDIエクスポート
│   │   │   └── ReportViewer.tsx      # Markdownレポートプレビュー
│   │   ├── services/api.ts
│   │   └── types/analysis.ts
└── run.sh                     # ワンクリック起動スクリプト
```
