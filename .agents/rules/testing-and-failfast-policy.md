# Testing, Fail-Fast & Quality Assurance Policy

## 1. No Silent Fallback (Fail Fast Principle)
- **Zero Masking of Failures**:
  - Never catch broad exceptions (`except Exception:`) to quietly return dummy data or copy original unseparated files to pass tests.
  - If a core tool (e.g. Demucs, music21, librosa, torch) fails, let it raise a descriptive exception (`RuntimeError` or `HTTPException 500`) immediately.
  - Tests must assert genuine execution outcomes rather than superficial file existence or HTTP 200 codes.

## 2. Real Dataflow Integration Testing
- **Backend E2E Pipeline Tests**:
  - Always implement and run full integration tests using `fastapi.testclient.TestClient`.
  - Verify the entire pipeline end-to-end: `POST /upload/` -> `POST /analyze/` -> `GET /export/audio/...` -> `GET /export/midi/...`.
  - Assert that separated stems produce distinct acoustic features and valid MIDI tracks.
- **Frontend Real Dataflow & Strict Props**:
  - Avoid overly permissive optional props (`prop?: string`) that allow parent components to omit vital data without compiler errors.
  - Verify that event handlers, state updates, and audio URL assignments actually deliver runtime values to child components.
