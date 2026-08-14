# music-phrase-analyzer: 仕様書 & 設計ドキュメント

## 1. プロジェクト概要
**music-phrase-analyzer** は、気になった楽曲フレーズを波形タイムライン上で部分指定（クリップ切り出し）し、**Demucs（音源分離）＋ Mirelo (MuScriptor: audio-to-MIDI)** を中核としてMIDI抽出し、さらに **music21 / pretty_midi / librosa** を用いて音楽理論（メロディ・コード・スケール）と音響特性（リズム・音色・音圧）を多角的に解析する「耳コピ支援＋楽曲分析ノート作成」Webアプリケーションです。

---

## 2. システム構成・アーキテクチャ

### 2.1 全体パイプライン
1. **ユーザー入力**:
   - 音声ファイル（MP3/WAV/FLAC等）のアップロード。
   - 波形・スペクトログラム上で解析対象範囲（例: 01:12 - 01:26）をドラッグ選択。
   - 解析対象ステムの選択（Vocals, Bass, Drums, Guitar, Piano, Other / 6s）。
2. **バックエンド処理**:
   - **音声クリップ抽出**: 指定範囲の音声のみを高速トリミング。
   - **ステム分離 (Demucs)**: `htdemucs` または `htdemucs_6s` で指定ステムを分離。
   - **Audio-to-MIDI (Mirelo / MuScriptor)**: ステム音声をMIDIノート系列に変換。
   - **音楽理論解析**:
     - メロディ解析 (`pretty_midi`, `music21`): 音域、ステップ/ジャンプ比率、スケール推定、モチーフ探索。
     - 和声・コード進行解析 (`music21`): 拍ごとのコード判定、ローマ数字度数分析、王道/丸サ/カノン等の定番進行判定、機能和声 (T/S/D)。
   - **音響・信号解析 (`librosa`)**:
     - リズム解析: テンポ/ビートグリッド推定、クオンタイズスナップ、シンコペーション率、最適ループ区間提案。
     - 音色解析: スペクトル重心 (Centroid)、アタック/ディケイ特性、MFCC分布、ステム別音圧比 (RMS)。
3. **出力・UI表示**:
   - ピアノロール & コードタイムライン可視化。
   - 音楽理論・音響特徴量ダッシュボード。
   - Web Audioによる音声ステム＋MIDIシンセの同期プレビュー再生。
   - 分析ノートの自動生成（Markdown / JSON形式）およびMIDIファイルのエクスポート。

---

## 3. ディレクトリ構成

```text
music-phrase-analyzer/
├── docs/
│   ├── SPECIFICATION.md       # 本仕様書
│   └── API.md                 # REST API仕様書
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI エントリポイント
│   │   ├── config.py          # 設定（ストレージパス、モデル設定）
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── upload.py      # 音声アップロード & クリップ管理
│   │   │   ├── analyze.py     # 解析実行 & 進捗通知
│   │   │   └── export.py      # MIDI / レポート出力
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── audio_utils.py     # 音声トリミング・フォーマット変換
│   │       ├── demucs_worker.py   # Demucsステム分離
│   │       ├── mirelo_worker.py   # Mirelo (MuScriptor) Audio-to-MIDI
│   │       ├── analysis_melody.py # メロディ・音域・モチーフ解析
│   │       ├── analysis_harmony.py# 和音・ローマ数字・進行パターン解析
│   │       ├── analysis_rhythm.py # リズム・BPM・グリッド・ループ解析
│   │       ├── analysis_timbre.py # 音色・スペクトル・音圧解析
│   │       └── report_gen.py      # Markdown/JSONレポート生成
│   ├── tests/
│   │   └── ...
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── AudioTimeline.tsx     # 波形・範囲選択 (Wavesurfer.js)
│   │   │   ├── StemSelector.tsx      # ステム選択UI
│   │   │   ├── PianoRoll.tsx         # ピアノロール可視化
│   │   │   ├── HarmonyTimeline.tsx   # コード進行・度数タイムライン
│   │   │   ├── TheoryDashboard.tsx   # 音楽理論・音響チャート
│   │   │   ├── PlayerControls.tsx    # 同期再生コントローラ
│   │   │   └── ReportViewer.tsx      # Markdownプレビュー・編集・出力
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── analysis.ts
└── README.md
```

---

## 4. 各モジュールの詳細仕様

### 4.1 バックエンドサービス (`backend/app/services/`)

#### `demucs_worker.py`
- `demucs.apply` または CLI を用いて、トリミングされた短尺クリップを分離。
- モデル: `htdemucs` (4 stems: vocals, drums, bass, other) または `htdemucs_6s` (vocals, drums, bass, guitar, piano, other)。
- 選択されたステムのみをWAVとして保存。

#### `mirelo_worker.py`
- `muscriptor` (Mirelo / Kyutai) モデルを用いて音声波形からMIDIを生成。
- 各ステムごとのMIDIを生成し、マルチトラックMIDI (`pretty_midi.PrettyMIDI`) として結合。
- 環境にGPU/モデルがない場合のフォールバック（軽量モック/Basic Pitch/ルールベース）にも対応する設計。

#### `analysis_melody.py`
- **音域**: 最低音・最高音（ノート名およびMIDI番号）、中央値、レンジ（半音数）。
- **インターバル統計**: 順次進行（$\le 2$半音）vs 跳躍（$\ge 3$半音）の割合、跳躍後の反転解決率。
- **スケール判定**: `music21.analysis.discrete.KrumhanslSchmuckler` またはピッチクラスヒストグラムによる推定。
- **モチーフ抽出**: n-gram (長さ3〜5) のピッチインターバルパターンの頻出ランキング。

#### `analysis_harmony.py`
- **和音判定**: `music21.chord.Chord` を用いて、拍（グリッド）ごとのコードネーム（Root, Quality, Inversion, Extensions）を同定。
- **度数・機能和声**: 主調に対するローマ数字度数（`music21.roman.RomanNumeral`）および Tonic/Subdominant/Dominant 分類。
- **進行パターンマッチ**:
  - 王道進行 (`IV - V - iii - vi`)
  - 丸サ進行 (`IVM7 - III7 - vi7 - I7`)
  - カノン進行 (`I - V - vi - iii - IV - I - IV - V`)
  - 小室進行 (`vi - IV - V - I`)
  - 2-5-1 (`ii - V - I`) / Just The Two of Us 進行 等のタグ付け。

#### `analysis_rhythm.py`
- **テンポ & ビート推定**: `librosa.beat.beat_track` によるBPMおよびビート時刻の検出。
- **クオンタイズ**: MIDIノートを最も近い拍（16分/8分）へスナップし、タイミングのズレ（マイクロタイミング）を算出。
- **リズム特性**: 8分/16分/3連符の優勢度、表拍 vs 裏拍のオンセット比率、シンコペーション係数。
- **最適ループ区間提案**: 自己相似性行列 (SSM) またはビート周期性に基づくループ推薦。

#### `analysis_timbre.py`
- **スペクトル特徴量**: Spectral Centroid（明るさ）、Spectral Rolloff、Spectral Flatness。
- **アタック特性**: オンセット立ち上がり時間、オンセット強度分布。
- **MFCC**: 13次元の平均・分散。
- **音圧バランス**: ステム別のRMSエネルギー比およびラフLUFS算出。

#### `report_gen.py`
- 全解析結果を集約し、可読性の高い構造化MarkdownノートおよびJSONを出力。

---

## 5. フロントエンドUI / UX 仕様

1. **タイムライン・波形操作**:
   - Wavesurfer.js による波形レンダリングとスペクトログラム表示。
   - リージョンプラグインによるドラッグ＆ドロップでの範囲選択。
   - 選択範囲のみのループ再生。
2. **ピアノロール表示**:
   - ステム別のMIDIノートをタイムライン同期でピアノロール描画。
   - ノートホバーで音名（C4, D#4…）、ベロシティ、継続時間をツールチップ表示。
3. **コード進行タイムライン**:
   - 小節・拍に連動してコードネームとローマ数字、機能（T/S/D）をカード表示。
4. **ダッシュボード・インサイト**:
   - 音域ゲージ、跳躍比円グラフ、リズム分布、音色レーダーチャート。
5. **エクスポート**:
   - ステム別/結合MIDIファイルダウンロード。
   - 分析Markdownノートのプレビュー、テキスト編集、ファイル保存。
