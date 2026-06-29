# J.A.R.V.I.S — Desktop App Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org
   - After install, open a terminal and verify: `node --version`

2. **Your Anthropic API key**
   - Get from: https://console.anthropic.com/keys

---

## Step 1 — Install Dependencies

Open a terminal inside the `jarvis-desktop` folder, then run:

```bash
npm install
npm install react react-dom
```

This downloads Electron, Vite, React, and all other packages (~200MB, one time only).

---

## Step 2 — Add Your API Key

Open `src/App.jsx` and find this line near the top:

```js
const CLAUDE_MODEL = "claude-sonnet-4-6";
```

Just above it, you'll see the fetch call in `sendMessage`. The API key is handled by the browser's built-in Anthropic header injection — **no changes needed here for claude.ai usage**.

> ⚠️ For the standalone desktop app, you need to add your API key.
> In `src/App.jsx`, find the fetch call and add the header:

```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": "YOUR_ANTHROPIC_API_KEY_HERE",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
```

---

## Step 3 — Run in Dev Mode (instant preview)

```bash
npm run build
npm run start
```

JARVIS will launch as a native desktop window. No browser needed.

---

## Step 4 — Package as an Installer (optional)

To create a real `.exe` installer for Windows:

```bash
npm run package
```

This creates a `release/` folder with a Windows NSIS installer you can run on any PC.

---

## File Structure

```
jarvis-desktop/
├── main.js          ← Electron main process (window management)
├── preload.js       ← Secure bridge between Electron and React
├── vite.config.js   ← Build config
├── index.html       ← HTML entry point
├── package.json     ← Dependencies & scripts
├── assets/          ← App icons (add icon.ico / icon.png here)
└── src/
    ├── main.jsx     ← React entry point
    └── App.jsx      ← Full JARVIS UI
```

---

## Wiring in Your Lerax STT/TTS (next step)

Since you already have Deepgram STT and ElevenLabs TTS from your Lerax Python assistant,
there are two ways to connect them:

### Option A — Python backend server (recommended)
Run your Lerax Python assistant as a local API server (FastAPI/Flask),
then call it from Electron via `fetch('http://localhost:8000/...')`.

### Option B — Pure JS (no Python)
- STT: Use the Web Speech API (built into Chrome/Electron, free)
- TTS: Call ElevenLabs REST API directly from React

Ask Claude to implement either option when you're ready.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Make sure Node.js v18+ is installed |
| White screen on launch | Run `npm run build` before `npm run start` |
| API not responding | Check your API key and internet connection |
| Window won't drag | Only the top title bar is draggable by design |

---

*Built for Lerax · Oman Air People & Culture · Muscat, GST+4*
