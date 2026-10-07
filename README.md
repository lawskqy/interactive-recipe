# The Quiet Cup

A local cafe recipe journal with **50 illustrated drinks: 27 warm and 23 cold**. Browse the collection, follow preparation steps, and ask an optional Gemini companion to help personalize a recipe.

## Features

- **Browse:** filter by temperature, search recipes or ingredients, and preview a drink before starting. Search filters stay in the URL and are preserved when returning from a recipe.
- **Prepare:** check off ingredients, navigate the method, explicitly mark completed steps, and restart preparation. Short action illustrations support pause, reset and reduced motion; they are demonstrations, not cooking timers.
- **Personalize:** ask naturally in chat, such as "Can you add vanilla?" Review the proposal, then click **Yes, apply changes** or type **yes**. Ingredients, method and tutorial update immediately. Type **no** to discard, or "yes, but less sugar" to request a revised proposal. Undo restores the preceding recipe.
- **Resume:** recipes, pending proposals, the last 40 chat messages, drafts, checklists and preparation progress are saved in this browser. Storage failures are shown in the interface.
- **Illustrate:** existing watercolor covers and ingredient/tool artwork work without AI. New step illustrations are generated only when requested; ComfyUI can optionally remove their backgrounds.
- **Recover:** missing artwork falls back to the original cover or a bundled placeholder. Invalid data and failed AI requests show recoverable errors.

## Stack

React 19, TypeScript, React Router and Vite on the frontend; Express 5 and the Google GenAI Node SDK on the backend. Python and Google ADK are no longer required by the app. ComfyUI is an optional, separate installation.

## Run locally

Use Node.js **^20.19.0 or >=22.12.0** and npm. The project was checked with Node 24.21.0. These commands use PowerShell; use `npm.cmd` if PowerShell blocks `npm.ps1`.

From the repository root, set up the backend:

```powershell
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm start
```

In another terminal, from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The backend listens at **http://127.0.0.1:8080**. Vite proxies API and media requests to it. Browsing and local preparation work without an API key; the frontend can also display its optimized artwork without the backend running.

On macOS/Linux, use the same npm commands and copy the environment template with `cp` if `.env` does not already exist.

## AI configuration

Add a Gemini key to **`backend/.env`**, then restart the backend:

```env
GEMINI_API_KEY=your_key_here
CHAT_MODEL=gemini-3.5-flash-lite
IMAGE_MODEL=gemini-2.5-flash-image
PORT=8080
COMFY_OUTPUT_DIR=
```

One key is used for chat and image generation. `GOOGLE_API_KEY` is accepted as a fallback. Model access, quota and billing depend on the configured Google account. The older 2.5 Flash-Lite text model can return 404 for new users, so the default chat model is 3.5 Flash-Lite.

The health endpoint, `/api/health`, reports whether configuration is present. It does **not** verify credentials, quota or live provider availability. Chat requests send the current recipe, recent conversation and message to Google; image requests send recipe context and reference artwork.

`.env` files and their variants are ignored by Git; `.env.example` templates contain public settings only. Never put keys in frontend `VITE_*` variables. If a key has ever been committed, revoke it: ignoring or deleting its file does not remove it from Git history.

### Optional ComfyUI background removal

Chat and image generation can run without ComfyUI. To enable background removal, install and run ComfyUI with the segment-anything custom nodes and the workflow's **GroundingDINO SwinB** and **SAM HQ ViT-H** models. Configure:

```env
COMFY_URL=http://127.0.0.1:8188
COMFY_OUTPUT_DIR=D:/ComfyUI/output
```

Use your actual output directory. ComfyUI must be able to read the backend's input images, and the backend must be able to read ComfyUI's output. The workflow is in `backend/segment-anything.json`. Its custom-node, model and path compatibility still needs a live check on the target installation. New illustration requests fall back to the original generated image if optional segmentation fails.

## Production preview

Install dependencies in both packages, then:

```powershell
cd frontend
npm run build
cd ../backend
npm start
```

Open **http://127.0.0.1:8080**. Build before starting or restarting the backend. Keep `frontend/public/images` available: the backend uses original covers as AI references and image fallbacks. The frontend build ships only optimized catalog and manifest assets.

The server deliberately binds to loopback and validates local Host headers. It is a **local application**, with no user accounts or public authentication. Public hosting requires an authenticated deployment boundary, per-user limits and appropriate media storage. `ALLOWED_ORIGINS` controls browser origins; it is not authentication. `VITE_API_BASE_URL` in `frontend/.env` can select a separate backend, but does not make that backend publicly reachable. If changing `PORT`, also update the Vite proxy targets.

## Project layout

| Path | Purpose |
| --- | --- |
| `frontend/src/pages/` | Collection and recipe workspace |
| `frontend/src/components/` | Recipe sheet, tutorial, artwork fallbacks and chat |
| `frontend/src/lib/` | API client, recipe validation and browser persistence |
| `frontend/public/recipes.json` | Recipe catalog |
| `frontend/public/images/` | Source covers and ingredient/tool artwork |
| `frontend/public/thumbnails/`, `assets/` | Optimized display images |
| `frontend/scripts/` | Asset preparation and build validation |
| `backend/server.js` | HTTP routes, Gemini requests and optional segmentation |
| `backend/core.js`, `resources.js` | Validation, queues, image cache and request allowance |
| `backend/test/`, `frontend/tests/` | Backend and browser tests |
| `.github/workflows/checks.yml` | Secret-pattern check, lint, build and tests |

## Artwork and recipe data

After adding recipes or replacing source artwork, run `npm run assets:prepare` from `frontend`. It creates 480-pixel WebP covers and small ingredient/tool assets. Commit the source artwork, optimized outputs and manifest together. `npm run build` validates recipe data, unique IDs and referenced asset files, but does not regenerate images.

Recipes use display strings for ingredient amounts, preserving ranges and alternatives. AI edits need user review; deterministic offline serving-size scaling is not implemented. Ingredient/tool matching and action illustrations are approximate aids; the full method remains authoritative.

## Checks

From the repository root:

```powershell
node scripts/check-secrets.cjs
cd backend
npm test
cd ../frontend
npm run lint
npm run build
npx playwright install chromium
npm test -- --workers=2
```

To run browser checks against the production build, from `frontend`:

```powershell
$env:TEST_PRODUCTION='1'
npm test -- --workers=2
Remove-Item Env:TEST_PRODUCTION
```

The production test server uses port 4180 with provider keys disabled. Automated tests mock AI responses and do not spend API credits. CI runs the production browser suite. The focused secret-pattern check scans current project text, not historical commits or ignored environment files.

Verified locally on 7 October 2026: build and lint, **11 backend tests**, and **38 production browser tests** passed. Coverage includes desktop/mobile Chromium, all 50 recipe routes, automated accessibility, artwork failures, approval by button or typed reply, reload persistence, Undo, Host validation, cache writes and request limits. Mobile tests emulate an iPhone viewport; Safari and Firefox are not covered. Real Gemini chat and a vanilla-addition proposal followed by typed approval were also verified. Live image generation and ComfyUI segmentation remain unverified. The GitHub workflow has not yet been run remotely.

## Local storage and resource limits

Saved preparation is specific to the browser and origin, with no device sync. Clear the site's browser data to remove saved recipes and conversations. Generated images are stored separately in ignored `backend/generated/`.

The backend limits POST requests to 30 per minute per IP, queues provider/image work, caps model output, and maintains a single-server allowance of 100 provider attempts per UTC day. This is not a monetary billing limit or a shared multi-process quota. Text requests are cancelled on disconnect; shared image jobs may finish within their timeout.

Generated PNGs are structurally checked and written atomically, with a 12 MiB per-image limit, 128 MiB generated-image cache limit and seven-day expiry. Expired files are removed on later writes; interrupted temporary files are outside that quota. Model, style and reference-content hashes prevent reuse of obsolete generated illustrations.
