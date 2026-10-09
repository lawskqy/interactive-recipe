# The Quiet Cup

A local cafe recipe journal with **50 illustrated drinks: 27 warm and 23 cold**. Browse the collection, follow preparation steps, and ask an optional Gemini companion to help personalize a recipe.

## Features

- **Browse:** filter by temperature, search recipes or ingredients, and preview a drink before starting. Search filters stay in the URL and are preserved when returning from a recipe.
- **Prepare:** check off ingredients, navigate the method, explicitly mark completed steps, and restart preparation. Short action illustrations support pause, reset and reduced motion; they are demonstrations, not cooking timers.
- **Personalize:** ask naturally in chat, such as "Can you add vanilla?" Review the proposal, then click **Yes, apply changes** or type **yes**. Ingredients, method and tutorial update immediately. Type **no** to discard, or "yes, but less sugar" to request a revised proposal. Undo restores the preceding recipe.
- **Resume:** recipes, pending proposals, the last 40 chat messages, drafts, checklists and preparation progress are saved in this browser. Storage failures are shown in the interface.
- **Illustrate:** Gemini plans the whole recipe's ingredients, tools, actions and intermediate preparations. Requested steps use the actual images of their prerequisite preparations, including separate branches such as prepared matcha and a blueberry base. Ingredients and tools gather into a particle burst that reveals the result, with pause, replay, reset and reduced motion. ComfyUI can remove backgrounds from both objects and step results; bundled ingredient/tool cutouts are reused where available.
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
COMFY_ENABLED=false
```

One key is used for chat and image generation. `GOOGLE_API_KEY` is accepted as a fallback. Model access, quota and billing depend on the configured Google account. The older 2.5 Flash-Lite text model can return 404 for new users, so the default chat model is 3.5 Flash-Lite.

The health endpoint, `/api/health`, reports whether configuration is present. It does **not** verify credentials, quota or live provider availability. Chat requests send the current recipe, recent conversation and message to Google; image requests send recipe context and reference artwork.

`.env` files and their variants are ignored by Git; `.env.example` templates contain public settings only. Never put keys in frontend `VITE_*` variables. If a key has ever been committed, revoke it: ignoring or deleting its file does not remove it from Git history.

### Optional ComfyUI background removal

Chat and image generation can run without ComfyUI. To enable background removal, install and run ComfyUI with the segment-anything custom nodes and the workflow's **GroundingDINO SwinB** and **SAM HQ ViT-H** models. Configure:

```env
COMFY_URL=http://127.0.0.1:8188
COMFY_ENABLED=true
```

Restart the backend after changing these settings. The preparation pipeline uploads source PNGs through ComfyUI's `/upload/image`, submits `backend/segment-anything.json`, polls its history, and downloads the RGBA result through `/view`. Node and ComfyUI do not need a shared filesystem. A nonempty `COMFY_OUTPUT_DIR` remains a legacy opt-in and is still used by the old single-image endpoints. The workflow's custom nodes and models must be installed in ComfyUI. These transport paths follow the [ComfyUI server API implementation](https://github.com/comfyanonymous/ComfyUI/blob/master/server.py).

If segmentation is disabled or fails, original images remain usable and technical diagnostics are logged in the browser console. **Retry background removal** retries failed cutouts and reuses cached original PNGs. Downstream result images are regenerated if their input references change. A real ComfyUI installation is still needed to verify the quality of the masks; API tests use simulated ComfyUI responses.

### Preparation pipeline

Click **Illustrate with AI** on any step. The backend plans the whole recipe once, validates the graph and corrects an invalid plan once before failing. Raw ingredient IDs (`i1`), tool IDs (`t1`) and output IDs (`s1o1`, meaning step 1's first output) are separate. Every output has a name, physical appearance and producing step. Unknown, duplicate, self-referencing and forward references are rejected. A step can produce up to three separate preparations; its first output is the main result illustration.

Only the requested step and its prerequisites are illustrated, in recipe order. Each result receives the actual images of its input ingredients/preparations and tools as labeled Gemini references. Set-aside preparations keep their own image; an unrelated previous step does not replace them. For blueberry matcha fizz, the final step uses **prepared matcha from step 1** and **the blueberry drink from step 6**, rather than matcha powder. Prompt construction uses the validated plan's physical descriptions and a shared isolated-object style; no agent framework is required.

Progress appears during planning, drawing and background removal. Earlier completed steps remain available if a later request fails. Navigation, recipe edits and **Cancel illustration** stop subsequent work; an image or segmentation request already in progress may finish and be cached. A job whose browser stops polling expires between tasks after two minutes. Replay uses the existing images and makes no AI request.

`POST /api/preparations` accepts `{ recipe, index, id? }` with a zero-based step index and optional client UUID. It returns a job snapshot; `GET /api/preparations/:id` reports the validated plan, completed visuals, progress and warnings. `POST /api/preparations/:id/cancel` cancels it. Jobs allow two active preparations and retain at most 32 snapshots. Plans and asset associations are cached for up to 12 recipe/configuration variants in server memory; a server restart requires replanning. Generated PNGs are cached on disk by prompt, model, workflow and reference-image content. Recipe edits create a new plan and reset the tutorial's visuals.

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
| `backend/preparation.js` | Whole-recipe planning, dependency validation, cancellable jobs and intermediate outputs |
| `backend/preparation-artwork.js` | Labeled image references, object/result caching and ComfyUI transport |
| `backend/test/`, `frontend/tests/` | Backend and browser tests |
| `.github/workflows/checks.yml` | Secret-pattern check, lint, build and tests |

## Artwork and recipe data

After adding recipes or replacing source artwork, run `npm run assets:prepare` from `frontend`. It creates 480-pixel WebP covers and small ingredient/tool assets. Commit the source artwork, optimized outputs and manifest together. `npm run build` validates recipe data, unique IDs and referenced asset files, but does not regenerate images.

Recipes use display strings for ingredient amounts, preserving ranges and alternatives. AI edits need user review; deterministic offline serving-size scaling is not implemented. Offline ingredient/tool matching is approximate; AI illustration uses the whole-recipe dependency plan. Structural validation catches broken links, but AI interpretation and generated artwork can still be imperfect; the full method remains authoritative.

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

Verified locally on 8 October 2026: build and lint, **22 backend tests**, and **50 production browser tests** passed. Coverage includes desktop/mobile Chromium, all 50 recipe routes, automated accessibility, preparation dependencies, exact reuse of intermediate images, multiple labeled image references, cancellation, partial-failure recovery, simulated ComfyUI upload/download, artwork failures, chat approval, reload persistence, Undo, Host validation, cache writes and request limits. Mobile tests emulate an iPhone viewport; Safari and Firefox are not covered. A live Gemini planning check correctly linked blueberry matcha fizz's final step to prepared matcha from step 1 and the sparkling blueberry base from step 6. Real Gemini chat and a vanilla-addition proposal followed by typed approval were previously verified. New image generation and actual ComfyUI segmentation remain unverified; ComfyUI was not reachable at the configured default address. The GitHub workflow has not been run remotely.

## Local storage and resource limits

Saved preparation is specific to the browser and origin, with no device sync. Clear the site's browser data to remove saved recipes and conversations. Generated images are stored separately in ignored `backend/generated/`.

The backend limits POST requests to 30 per minute per IP, queues provider/image work, caps model output, and maintains a single-server allowance of 100 provider attempts per UTC day. This is not a monetary billing limit or a shared multi-process quota. Text requests are cancelled on disconnect; shared image jobs may finish within their timeout.

Generated PNGs are structurally checked and written atomically, with a 12 MiB per-image limit, 128 MiB generated-image cache limit and seven-day expiry. Expired files are removed on later writes; interrupted temporary files are outside that quota. Model, style and reference-content hashes prevent reuse of obsolete generated illustrations.
