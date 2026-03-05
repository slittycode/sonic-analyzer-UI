# Sonic Analyzer UI

Frontend UI/UX application for sonic analysis workflows.

## Architecture

The frontend runs a two-stage flow:

1. **Phase 1 (required):** upload track to local DSP backend via `POST /api/analyze`.
2. **Phase 2 (optional):** run Gemini reconstruction advice in-browser when enabled.

The frontend remains usable in **phase-1-only mode** when Gemini is disabled.

## Prerequisites

- Node.js 20+
- npm
- Local DSP backend running with `POST /api/analyze`

## Environment

Copy `.env.example` to `.env` and set values as needed.

```bash
cp .env.example .env
```

Variables:

- `VITE_API_BASE_URL`: local backend base URL, default `http://127.0.0.1:8787`
- `VITE_ENABLE_PHASE2_GEMINI`: `true` or `false`
- `VITE_GEMINI_API_KEY`: optional; required only when phase 2 is enabled
- `DISABLE_HMR`: optional dev-server toggle

## Run locally

```bash
npm install
npm run dev
```

App URL:

- `http://127.0.0.1:3000`

## Backend API contract

### `POST /api/analyze`

Content type: `multipart/form-data`

Fields:

- `track` (required file)
- `dsp_json_override` (optional JSON string)

Example response:

```json
{
  "requestId": "req_001",
  "phase1": {
    "bpm": 126,
    "bpmConfidence": 0.93,
    "key": "F minor",
    "keyConfidence": 0.88,
    "timeSignature": "4/4",
    "durationSeconds": 210.6,
    "lufsIntegrated": -7.9,
    "truePeak": -0.2,
    "stereoWidth": 0.69,
    "stereoCorrelation": 0.84,
    "spectralBalance": {
      "subBass": -0.7,
      "lowBass": 1.2,
      "mids": -0.3,
      "upperMids": 0.4,
      "highs": 1.0,
      "brilliance": 0.8
    }
  },
  "diagnostics": {
    "backendDurationMs": 980,
    "engineVersion": "0.4.0"
  }
}
```

## Validation commands

```bash
npm run lint
npm run test:unit
npm run build
npm run test:smoke
```

Or run all checks:

```bash
npm run verify
```
