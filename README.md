# Toonly

Toonly is a focused portrait editor that turns a regular photo into a cartoon-like character. It uses **FLUX.2 Pro through Together AI** when a Together AI API key is available and falls back to a clearly labelled, private browser-only preview when it is not.

## Features

- Drag-and-drop or file-picker upload for JPEG, PNG, and WebP portraits
- Four curated styles: Soft 3D, Anime, Comic Ink, and Clay
- Optional detail instruction for identity-preserving adjustments
- Before/after comparison slider
- Result refinement with six focused adjustments and a custom instruction
- Four-image character packs generated from an approved master portrait
- Individual character-pack downloads and one-click ZIP export
- High-quality 1408×1408 (approximately 2MP) result download
- Responsive editor layout for desktop, tablet, and mobile
- Server-side Together AI key protection
- No database or permanent image storage

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the local server on port `8787`.

To test the production build:

```bash
npm run build
npm start
```

Then open `http://127.0.0.1:8787`.

If Node reports a certificate verification error on Windows, start it with the Windows system certificate store:

```bash
npm run start:system-ca
```

Use `npm run dev:system-ca` for the equivalent development mode. These scripts require a Node.js version that supports `--use-system-ca` (the project has been verified with Node.js 24).

## Enable Together AI generation

1. Create an API key in the [Together AI dashboard](https://api.together.ai/settings/api-keys).
2. Add prepaid credit and leave auto-recharge disabled if you want a fixed spending ceiling.
3. Copy `.env.example` to `.env`.
4. Add the key:

```env
TOGETHER_API_KEY=your_key_here
```

5. Restart the server.

The key is read only by the Express server and is never included in the browser bundle. Live portraits are held in memory only for the request and sent to Together AI for generation; Toonly does not persist them. Without a key, the app remains fully interactive and creates a local posterized preview without uploading the portrait.

## Architecture

```text
React/Vite editor
       │ multipart portrait + preset
       ▼
Express /api/generate
       │ private API key + in-memory reference image
       ▼
Together AI / FLUX.2 Pro
       │ one 1408×1408 base64 image
       ▼
Before/after canvas + download
```

Uploads are held in memory for the duration of one request. There is no database, upload directory, analytics SDK, or persistent gallery.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `TOGETHER_API_KEY` | For live AI | Together AI API key |
| `PORT` | No | Express port; defaults to `8787` |

## Safety and limits

- Maximum upload size: 10 MB
- Accepted types: JPEG, PNG, and WebP
- User instructions are limited to 280 characters
- One image is requested per generation, with no automatic provider retries
- Refinements each use one additional generation request
- Character packs use four sequential generation requests after an explicit confirmation
- Output is fixed at 1408×1408 (approximately 2MP) to balance quality and credit use
- Results should be reviewed before public or commercial use
- Users should only upload portraits they have permission to edit
